/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Legacy } from 'kibana';
import { PluginInitializerContext } from 'src/core/server';
import { plugin } from './index';
import { LegacySetup, ReportingSetupDeps, ReportingStartDeps } from './plugin';
import { PluginSetupContract as SecurityPluginSetup } from '../../../../plugins/security/server';
import { PluginStart as DataPluginStart } from '../../../../../src/plugins/data/server';

const buildLegacyDependencies = (server: Legacy.Server): LegacySetup => ({
  config: server.config,
  info: server.info,
  route: server.route.bind(server),
  plugins: {
    elasticsearch: server.plugins.elasticsearch,
    xpack_main: server.plugins.xpack_main,
  },
  savedObjects: server.savedObjects,
  uiSettingsServiceFactory: server.uiSettingsServiceFactory,
});

export const legacyInit = async (server: Legacy.Server) => {
  const coreSetup = server.newPlatform.setup.core;
  const pluginInstance = plugin(server.newPlatform.coreContext as PluginInitializerContext);

  await pluginInstance.setup(coreSetup, {
    security: server.newPlatform.setup.plugins.security as SecurityPluginSetup,
    usageCollection: server.newPlatform.setup.plugins.usageCollection,
    __LEGACY: buildLegacyDependencies(server),
  } as ReportingSetupDeps);

  // Schedule to call the "start" hook only after start dependencies are ready
  coreSetup.getStartServices().then(([core, plugins]) =>
    pluginInstance.start(core, {
      data: (plugins as any).data as DataPluginStart,
    } as ReportingStartDeps)
  );
};
