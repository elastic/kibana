/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import {
  API_VERSIONS,
  EVALS_DATASET_IMPORT_URL,
  ImportEvaluationDatasetExamplesRequestBody,
  ImportEvaluationDatasetExamplesRequestParams,
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
import type { RouteDependencies } from '../register_routes';

export const registerImportExamplesRoute = ({
  router,
  logger,
  canEncrypt,
  getEncryptedSavedObjectsStart,
  getSpaceId,
}: RouteDependencies) => {
  router.versioned
    .post({
      path: EVALS_DATASET_IMPORT_URL,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: { requiredPrivileges: [EVALS_API_PRIVILEGES.manage] },
      },
      summary: 'Import examples into evaluation dataset',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            params: buildRouteValidationWithZod(ImportEvaluationDatasetExamplesRequestParams),
            body: buildRouteValidationWithZod(ImportEvaluationDatasetExamplesRequestBody),
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

            return response.customError({
              statusCode: forwarded.statusCode,
              body: forwarded.body as any,
            });
          }

          const { datasetId } = request.params;
          const { examples } = request.body;
          const activeSpaceId = getSpaceId ? await getSpaceId(request) : DEFAULT_SPACE_ID;
          const evalsContext = await context.evals;
          const datasetClient = evalsContext.datasetService.getClient({ spaceId: activeSpaceId });

          const exists = await datasetClient.datasetExists(datasetId);
          if (!exists) {
            return response.notFound({
              body: { message: `Evaluation dataset not found: ${datasetId}` },
            });
          }

          const { added } = await datasetClient.addExamples(datasetId, examples, {
            rejectDuplicates: false,
            source: 'import',
          });

          return response.ok({
            body: {
              added,
              skipped_duplicates: examples.length - added,
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
          logger.error(`Failed to import evaluation dataset examples: ${errorMessage}`);
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to import evaluation dataset examples' },
          });
        }
      }
    );
};
