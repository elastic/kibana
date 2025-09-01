/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { errors } from '@elastic/elasticsearch';
import { handleEsError } from '@kbn/es-ui-shared-plugin/server';
import { versionCheckHandlerWrapper, REINDEX_OP_TYPE } from '@kbn/upgrade-assistant-pkg-server';

import { API_BASE_PATH_UPRGRADE_ASSISTANT } from '../constants';
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

export function registerReindexIndicesRoutes({
  router,
  version,
  getReindexService,
}: RouteDependencies) {
  const BASE_PATH = `${API_BASE_PATH_UPRGRADE_ASSISTANT}/reindex`;

  // Start reindex for an index
  router.post(
    {
      path: `${BASE_PATH}`,
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
    versionCheckHandlerWrapper(version.getMajorVersion())(async ({ core }, request, response) => {
      const {
        savedObjects: { getClient },
        elasticsearch: { client: esClient },
      } = await core;

      try {
        const reindexService = (await getReindexService()).getScopedClient({
          savedObjects: getClient({ includedHiddenTypes: [REINDEX_OP_TYPE] }),
          dataClient: esClient,
          request,
        });

        const result = await reindexService.reindexOrResume(request.body);

        return response.ok({
          body: result,
        });
      } catch (error) {
        if (error instanceof errors.ResponseError) {
          return handleEsError({ error, response });
        }
        return mapAnyErrorToKibanaHttpResponse(error);
      }
    })
  );

  // Get status
  router.get(
    {
      path: `${BASE_PATH}/{indexName}`,
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
    versionCheckHandlerWrapper(version.getMajorVersion())(async ({ core }, request, response) => {
      const {
        savedObjects,
        elasticsearch: { client: esClient },
      } = await core;
      const { getClient } = savedObjects;
      const { indexName } = request.params;

      try {
        const reindexService = (await getReindexService()).getScopedClient({
          savedObjects: getClient({ includedHiddenTypes: [REINDEX_OP_TYPE] }),
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
    })
  );

  // Cancel reindex
  router.post(
    {
      path: `${BASE_PATH}/{indexName}/cancel`,
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
    versionCheckHandlerWrapper(version.getMajorVersion())(async ({ core }, request, response) => {
      const {
        savedObjects,
        elasticsearch: { client: esClient },
      } = await core;
      const { indexName } = request.params;
      const { getClient } = savedObjects;

      try {
        const reindexService = (await getReindexService()).getScopedClient({
          savedObjects: getClient({ includedHiddenTypes: [REINDEX_OP_TYPE] }),
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
    })
  );
}
