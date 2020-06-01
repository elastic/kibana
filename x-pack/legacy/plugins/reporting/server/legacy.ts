/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Legacy } from 'kibana';
import { take } from 'rxjs/operators';
import { PluginInitializerContext } from 'src/core/server';
import { LicensingPluginSetup } from '../../../../plugins/licensing/server';
import { ReportingPluginSpecOptions } from '../';
import { PluginsSetup } from '../../../../plugins/reporting/server';
import { SecurityPluginSetup } from '../../../../plugins/security/server';
import { buildConfig } from './config';
import { plugin } from './index';
import { LegacySetup, ReportingStartDeps } from './types';

const buildLegacyDependencies = (
  server: Legacy.Server,
  reportingPlugin: ReportingPluginSpecOptions
): LegacySetup => ({
  route: server.route.bind(server),
  plugins: {
    xpack_main: server.plugins.xpack_main,
    reporting: reportingPlugin,
  },
});

/*
 * Starts the New Platform instance of Reporting using legacy dependencies
 */
export const legacyInit = async (
  server: Legacy.Server,
  reportingLegacyPlugin: ReportingPluginSpecOptions
) => {
  const { core: coreSetup } = server.newPlatform.setup;
  const { config$ } = (server.newPlatform.setup.plugins.reporting as PluginsSetup).__legacy;
  const reportingConfig = await config$.pipe(take(1)).toPromise();
  const __LEGACY = buildLegacyDependencies(server, reportingLegacyPlugin);

  const pluginInstance = plugin(
    server.newPlatform.coreContext as PluginInitializerContext,
    buildConfig(coreSetup, server, reportingConfig)
  );

  await pluginInstance.setup(coreSetup, {
    elasticsearch: coreSetup.elasticsearch,
    licensing: server.newPlatform.setup.plugins.licensing as LicensingPluginSetup,
    security: server.newPlatform.setup.plugins.security as SecurityPluginSetup,
    usageCollection: server.newPlatform.setup.plugins.usageCollection,
    __LEGACY,
  });

  // Schedule to call the "start" hook only after start dependencies are ready
  coreSetup.getStartServices().then(([core, plugins]) =>
    pluginInstance.start(core, {
      data: (plugins as ReportingStartDeps).data,
      __LEGACY,
    })
  );
};
