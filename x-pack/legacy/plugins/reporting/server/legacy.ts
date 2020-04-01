/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Legacy } from 'kibana';
import crypto from 'crypto';
import { get } from 'lodash';
import { CoreSetup, PluginInitializerContext } from 'src/core/server';
import { SecurityPluginSetup } from '../../../../plugins/security/server';
import { ReportingPluginSpecOptions } from '../types';
import { plugin } from './index';
import { LegacySetup, ReportingConfig, ReportingConfigType, ReportingStartDeps } from './types';

const buildLegacyDependencies = (
  server: Legacy.Server,
  reportingPlugin: ReportingPluginSpecOptions
): LegacySetup => ({
  route: server.route.bind(server),
  config: server.config,
  plugins: {
    xpack_main: server.plugins.xpack_main,
    reporting: reportingPlugin,
  },
});

const addConfigDefaults = (core: CoreSetup, baseConfig: ReportingConfigType) => {
  // encryption key
  let encryptionKey = baseConfig.encryptionKey;
  if (encryptionKey === undefined) {
    // FIXME log warning
    encryptionKey = crypto.randomBytes(16).toString('hex');
  }

  const { kibanaServer: reportingServer } = baseConfig;
  const serverInfo = core.http.getServerInfo();

  // kibanaServer.hostname, default to server.host, don't allow "0"
  let kibanaServerHostname = reportingServer.hostname ? reportingServer.hostname : serverInfo.host;
  if (kibanaServerHostname === '0') {
    // FIXME log warning
    kibanaServerHostname = '0.0.0.0';
  }

  // kibanaServer.port, default to server.port
  const kibanaServerPort = reportingServer.port
      ? reportingServer.port
      : serverInfo.port; // prettier-ignore

  // kibanaServer.protocol, default to server.protocol
  const kibanaServerProtocol = reportingServer.protocol
    ? reportingServer.protocol
    : serverInfo.protocol;

  return {
    ...baseConfig,
    encryptionKey,
    kibanaServer: {
      hostname: kibanaServerHostname,
      port: kibanaServerPort,
      protocol: kibanaServerProtocol,
    },
  };
};

const buildConfig = (
  core: CoreSetup,
  server: Legacy.Server,
  reportingConfig: ReportingConfigType
): ReportingConfig => {
  const config = server.config();
  const { http } = core;
  const serverInfo = http.getServerInfo();

  const kbnConfig = {
    path: {
      data: config.get('path.data'),
    },
    server: {
      basePath: core.http.basePath.serverBasePath,
      host: serverInfo.host,
      name: serverInfo.name,
      port: serverInfo.port,
      uuid: core.uuid.getInstanceUuid(),
      protocol: serverInfo.protocol,
    },
  };

  // spreading arguments as an array allows the return type to be known by the compiler
  reportingConfig = addConfigDefaults(core, reportingConfig);
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
  const fakeReporting = {
    config: buildConfig(coreSetup, server, legacyConfig.get('xpack.reporting')),
  }; // fake plugin with NP-compatible config interface

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
