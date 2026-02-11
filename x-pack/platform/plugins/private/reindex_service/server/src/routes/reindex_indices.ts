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

export const reindexSchema = schema.object({
  indexName: schema.string(),
  newIndexName: schema.string(),
  reindexOptions: schema.maybe(
    schema.object({
      enqueue: schema.maybe(schema.boolean()),
      deleteOldIndex: schema.maybe(schema.boolean()),
    })
  ),
  settings: schema.maybe(
    schema.object({
      mode: schema.maybe(
        schema.oneOf([
          schema.literal('standard'),
          schema.literal('lookup'),
          schema.literal('logsdb'),
          schema.literal('time_series'),
        ])
      ),
    })
  ),
});

export function registerReindexIndicesRoutes({ router, getReindexService }: RouteDependencies) {
  // Start reindex for an index
  router.post(
    {
      path: REINDEX_SERVICE_BASE_PATH,
      security: {
        authz: {
          enabled: false,
          reason: 'Relies on es and saved object clients for authorization',
        },
      },
      validate: {
        body: reindexSchema,
      },
    },
    async ({ core }, request, response) => {
      const {
        elasticsearch: { client: esClient },
      } = await core;

      if (request.body.newIndexName.trim().length === 0) {
        return response.badRequest({ body: 'New index name cannot be empty' });
      }

      try {
        const reindexService = (await getReindexService()).getScopedClient({
          dataClient: esClient,
          request,
        });

        const result = await reindexService.reindexOrResume({
          ...request.body,
          newIndexName: request.body.newIndexName.trim(),
        });

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

  // Get status
  router.get(
    {
      path: `${REINDEX_SERVICE_BASE_PATH}/{indexName}`,
      security: {
        authz: {
          enabled: false,
          reason: 'Relies on es and saved object clients for authorization',
        },
      },
      validate: {
        params: schema.object({
          indexName: schema.string(),
        }),
      },
    },
    async ({ core }, request, response) => {
      const {
        elasticsearch: { client: esClient },
      } = await core;
      const { indexName } = request.params;

      try {
        const reindexService = (await getReindexService()).getScopedClient({
          dataClient: esClient,
          request,
        });
        const body = await reindexService.getStatus(indexName);

        return response.ok({
          body,
        });
      } catch (error) {
        if (error instanceof errors.ResponseError) {
          return handleEsError({ error, response });
        }
        return mapAnyErrorToKibanaHttpResponse(error);
      }
    }
  );

  // Cancel reindex
  router.post(
    {
      path: `${REINDEX_SERVICE_BASE_PATH}/{indexName}/cancel`,
      security: {
        authz: {
          enabled: false,
          reason: 'Relies on es and saved object clients for authorization',
        },
      },
      validate: {
        params: schema.object({
          indexName: schema.string(),
        }),
      },
    },
    async ({ core }, request, response) => {
      const {
        elasticsearch: { client: esClient },
      } = await core;
      const { indexName } = request.params;

      try {
        const reindexService = (await getReindexService()).getScopedClient({
          dataClient: esClient,
          request,
        });
        await reindexService.cancel(indexName);

        return response.ok({ body: { acknowledged: true } });
      } catch (error) {
        if (error instanceof errors.ResponseError) {
          return handleEsError({ error, response });
        }

        return mapAnyErrorToKibanaHttpResponse(error);
      }
    }
  );
}
