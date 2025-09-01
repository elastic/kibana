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
import { reindexSchema } from './reindex_indices';

export function registerBatchReindexIndicesRoutes({
  router,
  version,
  getReindexService,
}: RouteDependencies) {
  const BASE_PATH = `${API_BASE_PATH_UPRGRADE_ASSISTANT}/reindex`;

  // Get the current batch queue
  router.get(
    {
      path: `${BASE_PATH}/batch/queue`,
      security: {
        authz: {
          enabled: false,
          reason: 'Relies on es client for authorization',
        },
      },
      validate: {},
    },
    versionCheckHandlerWrapper(version.getMajorVersion())(async ({ core }, request, response) => {
      const {
        elasticsearch: { client: esClient },
        savedObjects,
      } = await core;
      const { getClient } = savedObjects;

      try {
        const reindexService = (await getReindexService()).getScopedClient({
          savedObjects: getClient({ includedHiddenTypes: [REINDEX_OP_TYPE] }),
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
    })
  );

  // Add indices for reindexing to the worker's batch
  router.post(
    {
      path: `${BASE_PATH}/batch`,
      security: {
        authz: {
          enabled: false,
          reason: 'Relies on es client for authorization',
        },
      },
      validate: {
        body: schema.object({
          indices: schema.arrayOf(reindexSchema),
        }),
      },
    },
    versionCheckHandlerWrapper(version.getMajorVersion())(async ({ core }, request, response) => {
      const {
        savedObjects: { getClient },
        elasticsearch: { client: esClient },
      } = await core;
      const { indices } = request.body;

      const reindexService = (await getReindexService()).getScopedClient({
        savedObjects: getClient({ includedHiddenTypes: [REINDEX_OP_TYPE] }),
        dataClient: esClient,
        request,
      });
      const results = await reindexService.addToBatch(indices);

      return response.ok({ body: results });
    })
  );
}
