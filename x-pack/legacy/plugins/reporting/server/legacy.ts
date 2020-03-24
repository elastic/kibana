/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Legacy } from 'kibana';
import { get } from 'lodash';
import { take } from 'rxjs/operators';
import { CoreSetup, PluginInitializerContext } from 'src/core/server';
import { ConfigType, PluginsSetup } from '../../../../plugins/reporting/server';
import { SecurityPluginSetup } from '../../../../plugins/security/server';
import { ReportingPluginSpecOptions } from '../types';
import { plugin } from './index';
import { LegacySetup, ReportingConfig, ReportingStartDeps } from './types';

const buildLegacyDependencies = (
  coreSetup: CoreSetup,
  server: Legacy.Server,
  reportingPlugin: ReportingPluginSpecOptions
): LegacySetup => {
  return {
    route: server.route.bind(server),
    plugins: {
      xpack_main: server.plugins.xpack_main,
      reporting: reportingPlugin,
    },
  };
};

const buildConfig = (
  coreSetup: CoreSetup,
  server: Legacy.Server,
  reportingConfig: ConfigType
): ReportingConfig => {
  const config = server.config();
  const { http } = coreSetup;
  const serverInfo = http.getServerInfo();

  const kbnConfig = {
    path: {
      data: config.get('path.data'), // FIXME: get from the real PluginInitializerContext
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
  const { config$ } = (server.newPlatform.setup.plugins.reporting as PluginsSetup).__legacy;
  const reportingConfig = await config$.pipe(take(1)).toPromise();
  const reporting = { config: buildConfig(coreSetup, server, reportingConfig) };

  const __LEGACY = buildLegacyDependencies(coreSetup, server, reportingLegacyPlugin);

  const pluginInstance = plugin(server.newPlatform.coreContext as PluginInitializerContext); // NOTE: mocked-out PluginInitializerContext
  await pluginInstance.setup(coreSetup, {
    reporting,
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
