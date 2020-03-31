/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Legacy } from 'kibana';
import { get } from 'lodash';
import { CoreSetup, PluginInitializerContext } from 'src/core/server';
import { SecurityPluginSetup } from '../../../../plugins/security/server';
import { ReportingPluginSpecOptions } from '../types';
import { plugin } from './index';
import { LegacySetup, ReportingConfig, ReportingConfigType, ReportingStartDeps } from './types';

const buildLegacyDependencies = (
  server: Legacy.Server,
  reportingPlugin: ReportingPluginSpecOptions
): LegacySetup => {
  return {
    route: server.route.bind(server),
    config: server.config,
    plugins: {
      xpack_main: server.plugins.xpack_main,
      reporting: reportingPlugin,
    },
  };
};

const buildConfig = (
  coreSetup: CoreSetup,
  server: Legacy.Server,
  reportingConfig: ReportingConfigType
): ReportingConfig => {
  const config = server.config();
  const { http } = coreSetup;
  const serverInfo = http.getServerInfo();

  const kbnConfig = {
    path: {
      data: config.get('path.data'),
    },
    server: {
      basePath: coreSetup.http.basePath.serverBasePath,
      host: serverInfo.host,
      name: serverInfo.name,
      port: serverInfo.port,
      uuid: coreSetup.uuid.getInstanceUuid(),
      protocol: serverInfo.protocol,
    },
  };

  // spreading arguments as an array allows the return type to be known by the compiler
  return {
    get: (...keys: string[]) => get(reportingConfig, keys.join('.'), null),
    kbnConfig: {
      get: (...keys: string[]) => get(kbnConfig, keys.join('.'), null),
    },
  };
};

export const legacyInit = async (
  server: Legacy.Server,
  reportingLegacyPlugin: ReportingPluginSpecOptions
) => {
  const { core: coreSetup } = server.newPlatform.setup;
  const legacyConfig = server.config();
  const legacyReportingConfig = legacyConfig.get('xpack.reporting') as ReportingConfigType;
  const fakeReporting = { config: buildConfig(coreSetup, server, legacyReportingConfig) }; // fake plugin with NP-compatible config interface

  const __LEGACY = buildLegacyDependencies(server, reportingLegacyPlugin);

  const pluginInstance = plugin(
    server.newPlatform.coreContext as PluginInitializerContext,
    fakeReporting.config
  );
  await pluginInstance.setup(coreSetup, {
    reporting: fakeReporting,
    elasticsearch: coreSetup.elasticsearch,
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
