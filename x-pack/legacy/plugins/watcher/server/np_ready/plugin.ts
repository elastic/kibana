/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Plugin, CoreSetup } from 'src/core/server';
import { i18n } from '@kbn/i18n';
import { PLUGIN } from '../../common/constants';
import { ServerShim, NPServer } from './types';

import { registerLicenseChecker } from '../../../../server/lib/register_license_checker';
import { registerSettingsRoutes } from './routes/api/settings';
import { registerIndicesRoutes } from './routes/api/indices';
import { registerLicenseRoutes } from './routes/api/license';
import { registerWatchesRoutes } from './routes/api/watches';
import { registerWatchRoutes } from './routes/api/watch';
import { registerListFieldsRoute } from './routes/api/register_list_fields_route';
import { registerLoadHistoryRoute } from './routes/api/register_load_history_route';

export class WatcherServerPlugin implements Plugin<void, void, any, any> {
  async setup({ http }: CoreSetup, { __LEGACY: serverShim }: { __LEGACY: ServerShim }) {
    const router = http.createRouter();
    const npServer: NPServer = {
      router,
    };
    // Register license checker
    registerLicenseChecker(
      serverShim as any,
      PLUGIN.ID,
      PLUGIN.getI18nName(i18n),
      PLUGIN.MINIMUM_LICENSE_REQUIRED
    );

    registerListFieldsRoute(npServer, serverShim);
    registerLoadHistoryRoute(npServer, serverShim);
    registerIndicesRoutes(npServer, serverShim);
    registerLicenseRoutes(npServer, serverShim);
    registerSettingsRoutes(npServer, serverShim);
    registerWatchesRoutes(npServer, serverShim);
    registerWatchRoutes(npServer, serverShim);
  }
  start() {}
  stop() {}
}
