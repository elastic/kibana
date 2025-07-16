/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { errors } from '@elastic/elasticsearch';

import { versionCheckHandlerWrapper, REINDEX_OP_TYPE } from '@kbn/upgrade-assistant-pkg-server';
import { ReindexStatusResponse } from '@kbn/upgrade-assistant-pkg-common';
import { API_BASE_PATH_UPRGRADE_ASSISTANT } from '../constants';
import { reindexServiceFactory, ReindexWorker, generateNewIndexName } from '../lib';
import { reindexActionsFactory } from '../lib/reindex_actions';
import { RouteDependencies } from '../../types';
import { mapAnyErrorToKibanaHttpResponse } from './map_any_error_to_kibana_http_response';
import { reindexHandler } from '../lib/reindex_handler';

export function registerReindexIndicesRoutes(
  {
    credentialStore,
    router,
    licensing,
    log,
    getSecurityPlugin,
    lib: { handleEsError },
    version,
  }: RouteDependencies,
  getWorker: () => ReindexWorker
) {
  const BASE_PATH = `${API_BASE_PATH_UPRGRADE_ASSISTANT}/reindex`;

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
      validate: {
        params: schema.object({
          indexName: schema.string(),
        }),
      },
    },
    versionCheckHandlerWrapper(version.getMajorVersion())(async ({ core }, request, response) => {
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
          version,
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
      const asCurrentUser = esClient.asCurrentUser;
      const reindexActions = reindexActionsFactory(
        getClient({ includedHiddenTypes: [REINDEX_OP_TYPE] }),
        asCurrentUser,
        log,
        version
      );
      const reindexService = reindexServiceFactory(
        asCurrentUser,
        reindexActions,
        log,
        licensing,
        version
      );

      try {
        const hasRequiredPrivileges = await reindexService.hasRequiredPrivileges(indexName);
        const reindexOp = await reindexService.findReindexOperation(indexName);
        // If the user doesn't have privileges than querying for warnings is going to fail.
        const warnings = hasRequiredPrivileges
          ? await reindexService.detectReindexWarnings(indexName)
          : [];

        const isTruthy = (value?: string | boolean): boolean => value === true || value === 'true';
        const { aliases, settings, isInDataStream, isFollowerIndex } =
          await reindexService.getIndexInfo(indexName);

        const body: ReindexStatusResponse = {
          reindexOp: reindexOp ? reindexOp.attributes : undefined,
          warnings,
          hasRequiredPrivileges,
          meta: {
            indexName,
            reindexName: generateNewIndexName(indexName, version),
            aliases: Object.keys(aliases),
            isFrozen: isTruthy(settings?.frozen),
            isReadonly: isTruthy(settings?.verified_read_only),
            isInDataStream,
            isFollowerIndex,
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
      const callAsCurrentUser = esClient.asCurrentUser;
      const reindexActions = reindexActionsFactory(
        getClient({ includedHiddenTypes: [REINDEX_OP_TYPE] }),
        callAsCurrentUser,
        log,
        version
      );
      const reindexService = reindexServiceFactory(
        callAsCurrentUser,
        reindexActions,
        log,
        licensing,
        version
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
