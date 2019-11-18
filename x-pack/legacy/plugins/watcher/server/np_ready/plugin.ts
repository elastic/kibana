/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Plugin, CoreSetup, ElasticsearchServiceSetup } from 'src/core/server';
import { i18n } from '@kbn/i18n';
import { XPackMainPlugin } from '../../../xpack_main/xpack_main';
import { PLUGIN } from '../../common/constants';
// @ts-ignore
import { registerFieldsRoutes } from './routes/api/fields';
// @ts-ignore
import { registerSettingsRoutes } from './routes/api/settings';
// @ts-ignore
import { registerHistoryRoutes } from './routes/api/history';
// @ts-ignore
import { registerIndicesRoutes } from './routes/api/indices';
// @ts-ignore
import { registerLicenseRoutes } from './routes/api/license';
// @ts-ignore
import { registerWatchesRoutes } from './routes/api/watches';
// @ts-ignore
import { registerWatchRoutes } from './routes/api/watch';
import { registerLicenseChecker } from '../../../../server/lib/register_license_checker';

export interface ServerShim {
  route: any;
  plugins: {
    xpack_main: XPackMainPlugin;
    watcher: any;
    elasticsearch: ElasticsearchServiceSetup;
  };
}

export class WatcherServerPlugin implements Plugin<void, void, any, any> {
  async setup(core: CoreSetup, { __LEGACY: serverShim }: { __LEGACY: ServerShim }) {
    // Register license checker
    registerLicenseChecker(
      serverShim as any,
      PLUGIN.ID,
      PLUGIN.getI18nName(i18n),
      PLUGIN.MINIMUM_LICENSE_REQUIRED
    );

    registerFieldsRoutes(serverShim);
    registerHistoryRoutes(serverShim);
    registerIndicesRoutes(serverShim);
    registerLicenseRoutes(serverShim);
    registerSettingsRoutes(serverShim);
    registerWatchesRoutes(serverShim);
    registerWatchRoutes(serverShim);
  }
  start() {}
  stop() {}
}
