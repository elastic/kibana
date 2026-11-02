/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  API_VERSIONS,
  DeleteEvaluationDatasetRequestParams,
  DeleteEvaluationDatasetRequestQuery,
  EVALS_DATASET_URL,
  INTERNAL_API_ACCESS,
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
import type { RouteDependencies } from '../register_routes';

export const registerDeleteDatasetRoute = ({
  router,
  logger,
  canEncrypt,
  getEncryptedSavedObjectsStart,
  getSpaceId,
}: RouteDependencies) => {
  router.versioned
    .delete({
      path: EVALS_DATASET_URL,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: { requiredPrivileges: [EVALS_API_PRIVILEGES.manage] },
      },
      summary: 'Delete evaluation dataset',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            params: buildRouteValidationWithZod(DeleteEvaluationDatasetRequestParams),
            query: buildRouteValidationWithZod(DeleteEvaluationDatasetRequestQuery),
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
              method: 'DELETE',
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
          const { intent } = request.query;
          const activeSpaceId = getSpaceId ? await getSpaceId(request) : DEFAULT_SPACE_ID;
          const evalsContext = await context.evals;
          const datasetClient = evalsContext.datasetService.getClient({ spaceId: activeSpaceId });

          const result = await datasetClient.delete(datasetId, { intent });

          if (result === 'not_found') {
            return response.notFound({
              body: { message: `Evaluation dataset not found: ${datasetId}` },
            });
          }

          // The dataset's spaces changed since the caller read them, so the
          // delete they asked for is no longer the one that would happen.
          if (result === 'intent_mismatch') {
            return response.conflict({
              body: {
                message:
                  intent === 'unshare'
                    ? 'This dataset is no longer shared with any other space, so removing it from this one would delete it.'
                    : 'This dataset is now shared with another space, so deleting it here would only remove it from this one.',
              },
            });
          }

          return response.ok({
            body: {
              success: true,
              unshared: result === 'unshared',
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

          const errorMessage = error instanceof Error ? error.message : String(error);
          logger.error(`Failed to delete evaluation dataset: ${errorMessage}`);
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to delete evaluation dataset' },
          });
        }
      }
    );
};
