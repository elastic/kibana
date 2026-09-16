/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  API_VERSIONS,
  EVALS_DATASET_RESOLVE_URL,
  INTERNAL_API_ACCESS,
  ResolveEvaluationDatasetRequestQuery,
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
import { redactSpaceIds } from '../shared/resolve_dataset_spaces';
import type { RouteDependencies } from '../register_routes';
import { handleMaximumResponseSizeExceededError } from '../utils/handle_response_size_error';

/**
 * Looks a dataset up by name. Ids are derived from the owning space, so a
 * client holding only a name can no longer compute one for itself.
 */
export const registerResolveDatasetRoute = ({
  router,
  logger,
  canEncrypt,
  getEncryptedSavedObjectsStart,
  getSpaceId,
  getAccessibleSpaceIds,
}: RouteDependencies) => {
  router.versioned
    .get({
      path: EVALS_DATASET_RESOLVE_URL,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: { requiredPrivileges: [EVALS_API_PRIVILEGES.read] },
      },
      summary: 'Resolve evaluation dataset by name',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            query: buildRouteValidationWithZod(ResolveEvaluationDatasetRequestQuery),
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
              method: 'GET',
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

          const { name } = request.query;
          const activeSpaceId = getSpaceId ? await getSpaceId(request) : DEFAULT_SPACE_ID;
          const evalsContext = await context.evals;
          const datasetClient = evalsContext.datasetService.getClient({ spaceId: activeSpaceId });
          const dataset = await datasetClient.resolveByName(name);

          if (!dataset) {
            return response.notFound({
              body: { message: `Evaluation dataset not found: ${name}` },
            });
          }

          return response.ok({
            body: {
              id: dataset.id,
              name: dataset.name,
              description: dataset.description,
              tags: dataset.tags,
              maturity: dataset.maturity,
              examples_count: dataset.examples_count,
              created_at: dataset.created_at,
              updated_at: dataset.updated_at,
              space_ids: redactSpaceIds(
                dataset.space_ids,
                getAccessibleSpaceIds ? await getAccessibleSpaceIds(request) : undefined
              ),
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

          const tooLarge = handleMaximumResponseSizeExceededError({
            error,
            response,
            logger,
            context: 'Resolve evaluation dataset',
          });
          if (tooLarge) return tooLarge;

          const errorMessage = error instanceof Error ? error.message : String(error);
          logger.error(`Failed to resolve evaluation dataset: ${errorMessage}`);
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to resolve evaluation dataset' },
          });
        }
      }
    );
};
