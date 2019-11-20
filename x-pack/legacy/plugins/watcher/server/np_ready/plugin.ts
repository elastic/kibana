/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Plugin, CoreSetup } from 'src/core/server';
import { i18n } from '@kbn/i18n';
import { PLUGIN } from '../../common/constants';
import { ServerShim, ServerShimWithRouter } from './types';
// @ts-ignore
import { registerSettingsRoutes } from './routes/api/settings';
// @ts-ignore
import { registerIndicesRoutes } from './routes/api/indices';
// @ts-ignore
import { registerLicenseRoutes } from './routes/api/license';
// @ts-ignore
import { registerWatchesRoutes } from './routes/api/watches';
// @ts-ignore
import { registerWatchRoutes } from './routes/api/watch';
import { registerListFieldsRoute } from './routes/api/register_list_fields_route';
import { registerLoadHistoryRoute } from './routes/api/register_load_history_route';
import { registerLicenseChecker } from '../../../../server/lib/register_license_checker';

export class WatcherServerPlugin implements Plugin<void, void, any, any> {
  async setup({ http }: CoreSetup, { __LEGACY: serverShim }: { __LEGACY: ServerShim }) {
    const router = http.createRouter();
    const serverShimWithRouter: ServerShimWithRouter = {
      ...serverShim,
      router,
    };
    // Register license checker
    registerLicenseChecker(
      serverShimWithRouter as any,
      PLUGIN.ID,
      PLUGIN.getI18nName(i18n),
      PLUGIN.MINIMUM_LICENSE_REQUIRED
    );

    registerListFieldsRoute(serverShimWithRouter);
    registerLoadHistoryRoute(serverShimWithRouter);
    registerIndicesRoutes(serverShim);
    registerLicenseRoutes(serverShim);
    registerSettingsRoutes(serverShim);
    registerWatchesRoutes(serverShim);
    registerWatchRoutes(serverShim);
  }
  start() {}
  stop() {}
}
