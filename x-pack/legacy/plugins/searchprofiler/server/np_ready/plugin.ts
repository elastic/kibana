/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup, Plugin } from 'src/core/server';
import { LegacySetup } from './types';
import { checkLicense } from './lib';
// @ts-ignore
import { mirrorPluginStatus } from '../../../../server/lib/mirror_plugin_status';

import * as profileRoute from './routes/profile';

export class SearchProfilerServerPlugin implements Plugin {
  async setup(
    core: CoreSetup,
    {
      route,
      plugins: {
        __LEGACY: { thisPlugin, elasticsearch, xpackMain, commonRouteConfig },
      },
    }: LegacySetup
  ) {
    mirrorPluginStatus(xpackMain, thisPlugin);
    (xpackMain as any).status.once('green', () => {
      // Register a function that is called whenever the xpack info changes,
      // to re-compute the license check results for this plugin
      xpackMain.info.feature(thisPlugin.id).registerLicenseCheckResultsGenerator(checkLicense);
    });

    profileRoute.register({ elasticsearch }, route, commonRouteConfig);
  }

  async start() {}

  stop(): void {}
}
