/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { errors } from '@elastic/elasticsearch';

import { API_BASE_PATH } from '../../../common/constants';
import { ReindexStatusResponse, REINDEX_OP_TYPE } from '../../../common/types';
import { versionCheckHandlerWrapper } from '../../lib/es_version_precheck';
import { reindexServiceFactory, ReindexWorker, generateNewIndexName } from '../../lib/reindexing';
import { reindexActionsFactory } from '../../lib/reindexing/reindex_actions';
import { RouteDependencies } from '../../types';
import { mapAnyErrorToKibanaHttpResponse } from './map_any_error_to_kibana_http_response';
import { reindexHandler } from './reindex_handler';

export function registerReindexIndicesRoutes(
  {
    credentialStore,
    router,
    licensing,
    log,
    getSecurityPlugin,
    lib: { handleEsError },
  }: RouteDependencies,
  getWorker: () => ReindexWorker
) {
  const BASE_PATH = `${API_BASE_PATH}/reindex`;

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
        const result = await reindexHandler({
          savedObjects: getClient({ includedHiddenTypes: [REINDEX_OP_TYPE] }),
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
    versionCheckHandlerWrapper(async ({ core }, request, response) => {
      const {
        savedObjects,
        elasticsearch: { client: esClient },
      } = await core;
      const { getClient } = savedObjects;
      const { indexName } = request.params;
      const asCurrentUser = esClient.asCurrentUser;
      const reindexActions = reindexActionsFactory(
        getClient({ includedHiddenTypes: [REINDEX_OP_TYPE] }),
        asCurrentUser
      );
      const reindexService = reindexServiceFactory(asCurrentUser, reindexActions, log, licensing);

      try {
        const hasRequiredPrivileges = await reindexService.hasRequiredPrivileges(indexName);
        const reindexOp = await reindexService.findReindexOperation(indexName);
        // If the user doesn't have privileges than querying for warnings is going to fail.
        const warnings = hasRequiredPrivileges
          ? await reindexService.detectReindexWarnings(indexName)
          : [];

        const indexAliases = await reindexService.getIndexAliases(indexName);

        const body: ReindexStatusResponse = {
          reindexOp: reindexOp ? reindexOp.attributes : undefined,
          warnings,
          hasRequiredPrivileges,
          meta: {
            indexName,
            reindexName: generateNewIndexName(indexName),
            aliases: Object.keys(indexAliases),
          },
        };

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
      options: {
        access: 'public',
        summary: `Cancel reindex`,
      },
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
    versionCheckHandlerWrapper(async ({ core }, request, response) => {
      const {
        savedObjects,
        elasticsearch: { client: esClient },
      } = await core;
      const { indexName } = request.params;
      const { getClient } = savedObjects;
      const callAsCurrentUser = esClient.asCurrentUser;
      const reindexActions = reindexActionsFactory(
        getClient({ includedHiddenTypes: [REINDEX_OP_TYPE] }),
        callAsCurrentUser
      );
      const reindexService = reindexServiceFactory(
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
