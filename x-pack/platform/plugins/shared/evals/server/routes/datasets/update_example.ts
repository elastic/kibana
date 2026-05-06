/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  API_VERSIONS,
  EVALS_DATASET_EXAMPLE_URL,
  INTERNAL_API_ACCESS,
  UpdateEvaluationDatasetExampleRequestBody,
  UpdateEvaluationDatasetExampleRequestParams,
} from '@kbn/evals-common';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { PLUGIN_ID } from '../../../common';
import {
  ENCRYPTION_NOT_CONFIGURED_MESSAGE,
  RemoteDecryptionError,
  forwardToRemoteKibana,
  getDestinationFromRequest,
} from '../../remote_kibana/forward_to_remote_kibana';
import { ExampleAlreadyExistsError } from '../../storage/example_already_exists_error';
import { ExampleNotFoundError } from '../../storage/example_not_found_error';
import type { RouteDependencies } from '../register_routes';

export const registerUpdateExampleRoute = ({
  router,
  logger,
  canEncrypt,
  getEncryptedSavedObjectsStart,
}: RouteDependencies) => {
  router.versioned
    .put({
      path: EVALS_DATASET_EXAMPLE_URL,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: { requiredPrivileges: [PLUGIN_ID] },
      },
      summary: 'Update evaluation dataset example',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            params: buildRouteValidationWithZod(UpdateEvaluationDatasetExampleRequestParams),
            body: buildRouteValidationWithZod(UpdateEvaluationDatasetExampleRequestBody),
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

          const { datasetId, exampleId } = request.params;
          const { input, output, metadata } = request.body;
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

          const updatedExample = await datasetClient.updateExample(
            exampleId,
            {
              input,
              output,
              metadata,
            },
            datasetId
          );

          return response.ok({
            body: {
              id: updatedExample.id,
              dataset_id: updatedExample.dataset_id,
              input: updatedExample.input,
              output: updatedExample.output,
              metadata: updatedExample.metadata,
              created_at: updatedExample.created_at,
              updated_at: updatedExample.updated_at,
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

          if (error instanceof ExampleAlreadyExistsError) {
            return response.customError({
              statusCode: 409,
              body: { message: error.message },
            });
          }

          logger.error(`Failed to update evaluation dataset example: ${error}`);
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to update evaluation dataset example' },
          });
        }
      }
    );
};
