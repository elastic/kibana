/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Legacy } from 'kibana';
import { PluginInitializerContext } from 'src/core/server';
import { SecurityPluginSetup } from '../../../../plugins/security/server';
import { ReportingPluginSpecOptions } from '../types';
import { plugin } from './index';
import { LegacySetup, ReportingStartDeps } from './types';

const buildLegacyDependencies = (
  server: Legacy.Server,
  reportingPlugin: ReportingPluginSpecOptions
): LegacySetup => ({
  config: server.config,
  info: server.info,
  route: server.route.bind(server),
  plugins: {
    elasticsearch: server.plugins.elasticsearch,
    xpack_main: server.plugins.xpack_main,
    reporting: reportingPlugin,
  },
});

export const legacyInit = async (
  server: Legacy.Server,
  reportingPlugin: ReportingPluginSpecOptions
) => {
  const coreSetup = server.newPlatform.setup.core;
  const pluginInstance = plugin(server.newPlatform.coreContext as PluginInitializerContext);

  const __LEGACY = buildLegacyDependencies(server, reportingPlugin);
  await pluginInstance.setup(coreSetup, {
    elasticsearch: coreSetup.elasticsearch,
    security: server.newPlatform.setup.plugins.security as SecurityPluginSetup,
    usageCollection: server.newPlatform.setup.plugins.usageCollection,
    __LEGACY,
  });

  // Schedule to call the "start" hook only after start dependencies are ready
  coreSetup.getStartServices().then(([core, plugins]) =>
    pluginInstance.start(core, {
      elasticsearch: coreSetup.elasticsearch,
      data: (plugins as ReportingStartDeps).data,
      __LEGACY,
    })
  );
};
