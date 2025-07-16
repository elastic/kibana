/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// import { reindexActionsFactory, reindexServiceFactory } from '@kbn/upgrade-assistant-pkg-server';
import { versionCheckHandlerWrapper } from '@kbn/upgrade-assistant-pkg-server';
import { API_BASE_PATH } from '../../common/constants';
import { getESUpgradeStatus } from '../lib/es_deprecations_status';
import type { RouteDependencies } from '../types';
// import { ReindexingService } from '../reindexing_service';
// todo -perhaps this becomes api usage

export function registerESDeprecationRoutes({
  config: { featureSet, dataSourceExclusions },
  router,
  lib: { handleEsError },
  licensing,
  log,
  current,
}: RouteDependencies) {
  router.get(
    {
      path: `${API_BASE_PATH}/es_deprecations`,
      security: {
        authz: {
          enabled: false,
          reason: 'Relies on es and saved object clients for authorization',
        },
      },
      validate: false,
    },
    versionCheckHandlerWrapper(current.major)(async ({ core }, request, response) => {
      try {
        const {
          // savedObjects: { client: savedObjectsClient },
          elasticsearch: { client },
        } = await core;
        const status = await getESUpgradeStatus(client.asCurrentUser, {
          featureSet,
          dataSourceExclusions,
        });
        // this shouldn't need to happen - deal with later, not sure what is interesting
        /* TODO
        const asCurrentUser = client.asCurrentUser;
        const reindexActions = reindexActionsFactory(savedObjectsClient, asCurrentUser, log);
        const reindexService = reindexServiceFactory(asCurrentUser, reindexActions, log, licensing);
        const indexNames = [...status.migrationsDeprecations, ...status.enrichedHealthIndicators]
          .filter(({ index }) => typeof index !== 'undefined')
          .map(({ index }) => index as string);

        await reindexingService.cleanupReindexOperations(indexNames);
        */

        return response.ok({
          body: status,
        });
      } catch (error) {
        log.error(error);
        return handleEsError({ error, response });
      }
    })
  );
}
