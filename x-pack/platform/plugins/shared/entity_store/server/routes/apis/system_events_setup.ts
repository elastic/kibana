/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse } from '@kbn/core-http-server';
import { API_VERSIONS, ENTITY_STORE_ROUTES } from '../../../common';
import { getSystemEventsDashboardId } from '../../../common/domain/system_events';
import { DEFAULT_ENTITY_STORE_PERMISSIONS } from '../constants';
import type { EntityStorePluginRouter } from '../../types';
import { wrapMiddlewares } from '../middleware';
import { ENTITY_STORE_STATUS } from '../../domain/constants';

/**
 * Installs the system events streams and dashboard for stores installed before they existed.
 * Idempotent; the work runs as the internal user, so read access to Security is enough.
 */
export function registerSystemEventsSetup(router: EntityStorePluginRouter) {
  router.versioned
    .post({
      path: ENTITY_STORE_ROUTES.internal.SYSTEM_EVENTS_SETUP,
      access: 'internal',
      summary: 'Set up Entity Store system events',
      description: 'Install the run history data streams and dashboard if they are missing.',
      security: {
        authz: DEFAULT_ENTITY_STORE_PERMISSIONS,
      },
      enableQueryVersion: true,
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v2,
        validate: {},
      },
      wrapMiddlewares(async (ctx, _req, res): Promise<IKibanaResponse> => {
        const { assetManagerClient, namespace } = await ctx.entityStore;
        const { status } = await assetManagerClient.getStatus();
        if (status === ENTITY_STORE_STATUS.NOT_INSTALLED) {
          return res.ok({ body: { installed: false } });
        }
        await assetManagerClient.installSystemEvents();
        return res.ok({
          body: { installed: true, dashboardId: getSystemEventsDashboardId(namespace) },
        });
      })
    );
}
