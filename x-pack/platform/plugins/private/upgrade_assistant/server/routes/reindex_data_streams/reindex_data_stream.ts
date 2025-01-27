/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { errors } from '@elastic/elasticsearch';

import { API_BASE_PATH } from '../../../common/constants';
import {
  DATA_STREAM_REINDEX_OP_TYPE,
  DataStreamReindexStatusResponse,
} from '../../../common/types';
import { versionCheckHandlerWrapper } from '../../lib/es_version_precheck';
import { dataStreamReindexServiceFactory, DataStreamReindexWorker } from '../../lib/reindexing';
import { dataStreamReindexActionsFactory } from '../../lib/reindexing/data_stream_actions';
import { RouteDependencies } from '../../types';
import { mapAnyErrorToKibanaHttpResponse } from './map_any_error_to_kibana_http_response';
import { reindexDataStreamHandler } from './reindex_data_stream_handler';

export function registerReindexDataStreamRoutes(
  {
    credentialStore,
    router,
    licensing,
    log,
    getSecurityPlugin,
    lib: { handleEsError },
  }: RouteDependencies,
  getWorker: () => DataStreamReindexWorker
) {
  const BASE_PATH = `${API_BASE_PATH}/data_streams_reindex`;

  // Start reindex for an index
  router.post(
    {
      path: `${BASE_PATH}/{indexName}`,
      security: {
        authz: {
          enabled: false,
          reason: 'Relies on es and saved object clients for authorization',
        },
      },
      options: {
        access: 'public',
        summary: `Start or resume reindex`,
      },
      validate: {
        params: schema.object({
          indexName: schema.string(),
        }),
      },
    },
    versionCheckHandlerWrapper(async ({ core }, request, response) => {
      const {
        savedObjects: { getClient },
        elasticsearch: { client: esClient },
      } = await core;
      const { indexName } = request.params;
      try {
        const result = await reindexDataStreamHandler({
          savedObjects: getClient({ includedHiddenTypes: [DATA_STREAM_REINDEX_OP_TYPE] }),
          dataClient: esClient,
          indexName,
          log,
          licensing,
          request,
          credentialStore,
          security: getSecurityPlugin(),
        });

        // Kick the worker on this node to immediately pickup the new reindex operation.
        getWorker().forceRefresh();

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
      options: {
        access: 'public',
        summary: `Get reindex status`,
      },
      validate: {
        params: schema.object({
          indexName: schema.string(),
        }),
      },
    },
    versionCheckHandlerWrapper(async ({ core }, request, response) => {
      const {
        savedObjects,
        elasticsearch: { client: esClient },
      } = await core;
      const { getClient } = savedObjects;
      const { indexName } = request.params;
      const asCurrentUser = esClient.asCurrentUser;
      const reindexActions = dataStreamReindexActionsFactory(
        getClient({ includedHiddenTypes: [DATA_STREAM_REINDEX_OP_TYPE] }),
        asCurrentUser
      );
      const reindexService = dataStreamReindexServiceFactory(
        asCurrentUser,
        reindexActions,
        log,
        licensing
      );

      try {
        const hasRequiredPrivileges = await reindexService.hasRequiredPrivileges(indexName);
        const reindexOp = await reindexService.findReindexOperation(indexName);
        // If the user doesn't have privileges than querying for warnings is going to fail.
        const warnings = hasRequiredPrivileges
          ? await reindexService.detectReindexWarnings(indexName)
          : [];

        const dataStreamMetadata = await reindexService.getDataStreamStats(indexName);
        console.log('dataStreamMetadata::', dataStreamMetadata);

        const body: DataStreamReindexStatusResponse = {
          reindexOp: reindexOp ? reindexOp.attributes : undefined,
          warnings,
          hasRequiredPrivileges,
          meta: dataStreamMetadata,
        };

        return response.ok({
          body,
        });
      } catch (error) {
        console.log('error in handler', error);
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
      options: {
        access: 'public',
        summary: `Cancel reindex`,
      },
      validate: {
        params: schema.object({
          indexName: schema.string(),
        }),
      },
    },
    versionCheckHandlerWrapper(async ({ core }, request, response) => {
      const {
        savedObjects,
        elasticsearch: { client: esClient },
      } = await core;
      const { indexName } = request.params;
      const { getClient } = savedObjects;
      const callAsCurrentUser = esClient.asCurrentUser;
      const reindexActions = dataStreamReindexActionsFactory(
        getClient({ includedHiddenTypes: [DATA_STREAM_REINDEX_OP_TYPE] }),
        callAsCurrentUser
      );
      const reindexService = dataStreamReindexServiceFactory(
        callAsCurrentUser,
        reindexActions,
        log,
        licensing
      );

      try {
        await reindexService.cancelReindexing(indexName);

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
