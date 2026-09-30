/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import {
  API_VERSIONS,
  EVALS_DATASET_COPY_URL,
  CopyEvaluationDatasetRequestBody,
  CopyEvaluationDatasetRequestParams,
  INTERNAL_API_ACCESS,
} from '@kbn/evals-common';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { EVALS_API_PRIVILEGES } from '../../../common';
import {
  ENCRYPTION_NOT_CONFIGURED_MESSAGE,
  RemoteDecryptionError,
  forwardToRemoteKibana,
  getDestinationFromRequest,
} from '../../remote_kibana/forward_to_remote_kibana';
import { DatasetAlreadyExistsError } from '../../storage/datasets/dataset_already_exists_error';
import type { RouteDependencies } from '../register_routes';

export const registerCopyDatasetRoute = ({
  router,
  logger,
  canEncrypt,
  getEncryptedSavedObjectsStart,
  getSpaceId,
}: RouteDependencies) => {
  router.versioned
    .post({
      path: EVALS_DATASET_COPY_URL,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: { requiredPrivileges: [EVALS_API_PRIVILEGES.manage] },
      },
      summary: 'Copy evaluation dataset',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            params: buildRouteValidationWithZod(CopyEvaluationDatasetRequestParams),
            body: buildRouteValidationWithZod(CopyEvaluationDatasetRequestBody),
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
              body: request.body,
            });

            if (forwarded.statusCode === 200) {
              return response.ok({ body: forwarded.body });
            }
            if (forwarded.statusCode === 404) {
              return response.notFound({ body: forwarded.body as any });
            }
            if (forwarded.statusCode === 409) {
              return response.customError({ statusCode: 409, body: forwarded.body as any });
            }

            return response.customError({
              statusCode: forwarded.statusCode,
              body: forwarded.body as any,
            });
          }

          const { datasetId } = request.params;
          const { name, description } = request.body;
          const activeSpaceId = getSpaceId ? await getSpaceId(request) : DEFAULT_SPACE_ID;
          const evalsContext = await context.evals;
          const datasetClient = evalsContext.datasetService.getClient({ spaceId: activeSpaceId });

          const dataset = await datasetClient.copy(datasetId, { name, description });
          if (!dataset) {
            return response.notFound({
              body: { message: `Evaluation dataset not found: ${datasetId}` },
            });
          }

          return response.ok({
            body: {
              dataset_id: dataset.id,
              name: dataset.name,
              examples_count: dataset.examples_count,
            },
          });
        } catch (error) {
          if (error instanceof RemoteDecryptionError) {
            logger.error(`Remote decryption failed: ${error.message}`);
            return response.customError({
              statusCode: 400,
              body: { message: error.message },
            });
          }

          if (error instanceof DatasetAlreadyExistsError) {
            return response.customError({
              statusCode: 409,
              body: { message: error.message },
            });
          }

          const errorMessage = error instanceof Error ? error.message : String(error);
          logger.error(`Failed to copy evaluation dataset: ${errorMessage}`);
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to copy evaluation dataset' },
          });
        }
      }
    );
};
