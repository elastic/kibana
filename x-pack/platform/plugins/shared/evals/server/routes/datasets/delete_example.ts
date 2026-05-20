/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  API_VERSIONS,
  DeleteEvaluationDatasetExampleRequestParams,
  EVALS_DATASET_EXAMPLE_URL,
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
import { ExampleNotFoundError } from '../../storage/example_not_found_error';
import type { RouteDependencies } from '../register_routes';

export const registerDeleteExampleRoute = ({
  router,
  logger,
  canEncrypt,
  getEncryptedSavedObjectsStart,
}: RouteDependencies) => {
  router.versioned
    .delete({
      path: EVALS_DATASET_EXAMPLE_URL,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: { requiredPrivileges: [EVALS_API_PRIVILEGES.manage] },
      },
      summary: 'Delete evaluation dataset example',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            params: buildRouteValidationWithZod(DeleteEvaluationDatasetExampleRequestParams),
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

          const { datasetId, exampleId } = request.params;
          const coreContext = await context.core;
          const evalsContext = await context.evals;
          const esClient = coreContext.elasticsearch.client.asCurrentUser;
          const datasetClient = evalsContext.datasetService.getClient(esClient);

          const exists = await datasetClient.datasetExists(datasetId);
          if (!exists) {
            return response.notFound({
              body: { message: `Evaluation dataset not found: ${datasetId}` },
            });
          }

          await datasetClient.deleteExample(exampleId, datasetId);

          return response.ok({
            body: {
              success: true,
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

          if (error instanceof ExampleNotFoundError) {
            return response.notFound({
              body: { message: error.message },
            });
          }

          logger.error(`Failed to delete evaluation dataset example: ${error}`);
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to delete evaluation dataset example' },
          });
        }
      }
    );
};
