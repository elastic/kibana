/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  API_VERSIONS,
  EVALS_DATASET_URL,
  INTERNAL_API_ACCESS,
  UpdateEvaluationDatasetRequestBody,
  UpdateEvaluationDatasetRequestParams,
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
import {
  redactSpaceIds,
  resolveTargetSpaces,
  withoutSpaceIds,
} from '../shared/resolve_dataset_spaces';
import type { RouteDependencies } from '../register_routes';

export const registerUpdateDatasetRoute = ({
  router,
  logger,
  canEncrypt,
  getEncryptedSavedObjectsStart,
  getSpaceId,
  getAccessibleSpaceIds,
  checkManageEvalsPrivileges,
}: RouteDependencies) => {
  router.versioned
    .put({
      path: EVALS_DATASET_URL,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: { requiredPrivileges: [EVALS_API_PRIVILEGES.manage] },
      },
      summary: 'Update evaluation dataset',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            params: buildRouteValidationWithZod(UpdateEvaluationDatasetRequestParams),
            body: buildRouteValidationWithZod(UpdateEvaluationDatasetRequestBody),
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
              method: 'PUT',
              body: withoutSpaceIds(request.body),
            });

            if (forwarded.statusCode === 200) {
              return response.ok({ body: forwarded.body });
            }
            if (forwarded.statusCode === 404) {
              return response.notFound({ body: forwarded.body as any });
            }

            return response.customError({
              statusCode: forwarded.statusCode,
              body: forwarded.body as any,
            });
          }

          const { datasetId } = request.params;
          const { description, tags, maturity, space_ids: requestedSpaceIds } = request.body;
          const activeSpaceId = getSpaceId ? await getSpaceId(request) : DEFAULT_SPACE_ID;
          const evalsContext = await context.evals;
          const datasetClient = evalsContext.datasetService.getClient({ spaceId: activeSpaceId });

          let targetSpaceIds: string[] | undefined;
          if (requestedSpaceIds) {
            const existing = await datasetClient.getMetadata(datasetId);
            if (!existing) {
              return response.notFound({
                body: { message: `Evaluation dataset not found: ${datasetId}` },
              });
            }

            const targetSpaces = await resolveTargetSpaces({
              request,
              activeSpaceId,
              requestedSpaceIds,
              currentSpaceIds: existing.space_ids,
              getAccessibleSpaceIds,
              checkManageEvalsPrivileges,
            });

            if (!targetSpaces.authorized) {
              return response.customError({
                statusCode: targetSpaces.statusCode,
                body: { message: targetSpaces.message },
              });
            }

            // Dropping the active space here would make the dataset vanish
            // mid-edit. Leaving a space is a delete, where the confirmation is.
            if (!targetSpaces.spaceIds.includes(activeSpaceId)) {
              return response.badRequest({
                body: {
                  message: `A dataset cannot be removed from the current space by updating it; delete it from this space instead.`,
                },
              });
            }

            targetSpaceIds = targetSpaces.spaceIds;
          }

          const updatedDataset = await datasetClient.update(datasetId, {
            description,
            tags,
            maturity,
            spaceIds: targetSpaceIds,
          });

          if (!updatedDataset) {
            return response.notFound({
              body: { message: `Evaluation dataset not found: ${datasetId}` },
            });
          }

          return response.ok({
            body: {
              id: updatedDataset.id,
              name: updatedDataset.name,
              description: updatedDataset.description,
              tags: updatedDataset.tags,
              maturity: updatedDataset.maturity,
              space_ids: redactSpaceIds(
                updatedDataset.space_ids,
                getAccessibleSpaceIds ? await getAccessibleSpaceIds(request) : undefined
              ),
              created_at: updatedDataset.created_at,
              updated_at: updatedDataset.updated_at,
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
            return response.conflict({ body: { message: error.message } });
          }

          const errorMessage = error instanceof Error ? error.message : String(error);
          logger.error(`Failed to update evaluation dataset: ${errorMessage}`);
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to update evaluation dataset' },
          });
        }
      }
    );
};
