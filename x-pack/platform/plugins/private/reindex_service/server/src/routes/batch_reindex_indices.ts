/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { errors } from '@elastic/elasticsearch';
import { handleEsError } from '@kbn/es-ui-shared-plugin/server';
import { REINDEX_SERVICE_BASE_PATH } from '../../../common';
import type { RouteDependencies } from '../../types';
import { mapAnyErrorToKibanaHttpResponse } from './map_any_error_to_kibana_http_response';
import { reindexSchema } from './reindex_indices';

export function registerBatchReindexIndicesRoutes({
  router,
  getReindexService,
}: RouteDependencies) {
  // Get the current batch queue
  router.get(
    {
      path: `${REINDEX_SERVICE_BASE_PATH}/batch/queue`,
      security: {
        authz: {
          enabled: false,
          reason: 'Relies on es client for authorization',
        },
      },
      validate: {},
    },
    async ({ core }, request, response) => {
      const {
        elasticsearch: { client: esClient },
      } = await core;

      try {
        const reindexService = (await getReindexService()).getScopedClient({
          dataClient: esClient,
          request,
        });
        const result = await reindexService.getBatchQueueResponse();
        return response.ok({
          body: result,
        });
      } catch (error) {
        if (error instanceof errors.ResponseError) {
          return handleEsError({ error, response });
        }
        return mapAnyErrorToKibanaHttpResponse(error);
      }
    }
  );

  // Add indices for reindexing to the worker's batch
  router.post(
    {
      path: `${REINDEX_SERVICE_BASE_PATH}/batch`,
      security: {
        authz: {
          enabled: false,
          reason: 'Relies on es client for authorization',
        },
      },
      validate: {
        body: schema.object({
          indices: schema.arrayOf(reindexSchema, { maxSize: 1000 }),
        }),
      },
    },
    async ({ core }, request, response) => {
      const {
        elasticsearch: { client: esClient },
      } = await core;
      const { indices } = request.body;

      const reindexService = (await getReindexService()).getScopedClient({
        dataClient: esClient,
        request,
      });
      const results = await reindexService.addToBatch(indices);

      return response.ok({ body: results });
    }
  );
}
