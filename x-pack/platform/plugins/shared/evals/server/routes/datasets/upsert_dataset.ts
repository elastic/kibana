/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  API_VERSIONS,
  EVALS_DATASET_UPSERT_URL,
  INTERNAL_API_ACCESS,
  UpsertEvaluationDatasetRequestBody,
  resolveDatasetHomeSpace,
} from '@kbn/evals-common';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { EVALS_API_PRIVILEGES } from '../../../common';
import {
  ENCRYPTION_NOT_CONFIGURED_MESSAGE,
  RemoteDecryptionError,
  forwardToRemoteKibana,
  getDestinationFromRequest,
} from '../../remote_kibana/forward_to_remote_kibana';
import { DatasetAlreadyExistsError } from '../../storage/datasets/dataset_already_exists_error';
import { resolveTargetSpaces, withoutSpaceIds } from '../shared/resolve_dataset_spaces';
import type { RouteDependencies } from '../register_routes';
import { handleMaximumResponseSizeExceededError } from '../utils/handle_response_size_error';

const DATASET_UPSERT_PAYLOAD_CAP_BYTES = 5 * 1024 * 1024;

export const registerUpsertDatasetRoute = ({
  router,
  logger,
  canEncrypt,
  getEncryptedSavedObjectsStart,
  getSpaceId,
  getAccessibleSpaceIds,
  checkManageEvalsPrivileges,
}: RouteDependencies) => {
  router.versioned
    .post({
      path: EVALS_DATASET_UPSERT_URL,
      access: INTERNAL_API_ACCESS,
      options: {
        body: {
          maxBytes: DATASET_UPSERT_PAYLOAD_CAP_BYTES,
        },
      },
      security: {
        authz: { requiredPrivileges: [EVALS_API_PRIVILEGES.manage] },
      },
      summary: 'Upsert evaluation dataset',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            body: buildRouteValidationWithZod(UpsertEvaluationDatasetRequestBody),
          },
        },
      },
      async (context, request, response) => {
        try {
          const destination = getDestinationFromRequest(request);
          if (destination && destination !== 'local') {
            if (!canEncrypt) {
              return response.customError({
                statusCode: 501,
                body: { message: ENCRYPTION_NOT_CONFIGURED_MESSAGE },
              });
            }
            const encryptedSavedObjects = await getEncryptedSavedObjectsStart();
            const forwarded = await forwardToRemoteKibana({
              encryptedSavedObjects,
              remoteId: destination,
              request,
              method: 'POST',
              body: withoutSpaceIds(request.body),
            });

            if (forwarded.statusCode === 200) {
              return response.ok({ body: forwarded.body });
            }

            return response.customError({
              statusCode: forwarded.statusCode,
              body: forwarded.body as any,
            });
          }

          const {
            name,
            description,
            tags,
            maturity,
            examples,
            space_ids: requestedSpaceIds,
          } = request.body;
          const activeSpaceId = getSpaceId ? await getSpaceId(request) : DEFAULT_SPACE_ID;

          const targetSpaces = await resolveTargetSpaces({
            request,
            activeSpaceId,
            requestedSpaceIds,
            getAccessibleSpaceIds,
            checkManageEvalsPrivileges,
          });

          if (!targetSpaces.authorized) {
            return response.customError({
              statusCode: targetSpaces.statusCode,
              body: { message: targetSpaces.message },
            });
          }

          const evalsContext = await context.evals;
          // Scoped to where the dataset should live, not where the call came
          // from, so `--space-ids b` from an unprefixed CLI run finds the
          // dataset in space B instead of creating a second one in default.
          const datasetClient = evalsContext.datasetService.getClient({
            spaceId: resolveDatasetHomeSpace(activeSpaceId, targetSpaces.spaceIds),
          });
          const upsertResult = await datasetClient.upsert({
            name,
            description,
            tags,
            maturity,
            examples,
            spaceIds: targetSpaces.spaceIds,
          });

          return response.ok({
            body: upsertResult,
          });
        } catch (error) {
          if (error instanceof RemoteDecryptionError) {
            logger.error(`Remote decryption failed: ${error.message}`);
            return response.customError({
              statusCode: 400,
              body: { message: error.message },
            });
          }

          const tooLarge = handleMaximumResponseSizeExceededError({
            error,
            response,
            logger,
            context: 'Upsert evaluation dataset',
          });
          if (tooLarge) return tooLarge;

          // A name the run's own dataset does not hold, in one of the spaces it
          // asked for. Nothing an upsert can settle on the caller's behalf.
          if (error instanceof DatasetAlreadyExistsError) {
            return response.conflict({ body: { message: error.message } });
          }

          const errorMessage = error instanceof Error ? error.message : String(error);
          logger.error(`Failed to upsert evaluation dataset: ${errorMessage}`);
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to upsert evaluation dataset' },
          });
        }
      }
    );
};
