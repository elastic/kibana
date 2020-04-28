/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Legacy } from 'kibana';
import { CoreSetup } from 'src/core/server';
import { i18n } from '@kbn/i18n';
import crypto from 'crypto';
import { get } from 'lodash';
import { NetworkPolicy } from '../../types';

// make config.get() aware of the value type it returns
interface Config<BaseType> {
  get<Key1 extends keyof BaseType>(key1: Key1): BaseType[Key1];
  get<Key1 extends keyof BaseType, Key2 extends keyof BaseType[Key1]>(
    key1: Key1,
    key2: Key2
  ): BaseType[Key1][Key2];
  get<
    Key1 extends keyof BaseType,
    Key2 extends keyof BaseType[Key1],
    Key3 extends keyof BaseType[Key1][Key2]
  >(
    key1: Key1,
    key2: Key2,
    key3: Key3
  ): BaseType[Key1][Key2][Key3];
  get<
    Key1 extends keyof BaseType,
    Key2 extends keyof BaseType[Key1],
    Key3 extends keyof BaseType[Key1][Key2],
    Key4 extends keyof BaseType[Key1][Key2][Key3]
  >(
    key1: Key1,
    key2: Key2,
    key3: Key3,
    key4: Key4
  ): BaseType[Key1][Key2][Key3][Key4];
}

interface KbnServerConfigType {
  path: { data: string };
  server: {
    basePath: string;
    host: string;
    name: string;
    port: number;
    protocol: string;
    uuid: string;
  };
}

export interface ReportingConfig extends Config<ReportingConfigType> {
  kbnConfig: Config<KbnServerConfigType>;
}

type BrowserType = 'chromium';

interface BrowserConfig {
  inspect: boolean;
  userDataDir: string;
  viewport: { width: number; height: number };
  disableSandbox: boolean;
  proxy: {
    enabled: boolean;
    server?: string;
    bypass?: string[];
  };
}

interface CaptureConfig {
  browser: {
    type: BrowserType;
    autoDownload: boolean;
    chromium: BrowserConfig;
  };
  maxAttempts: number;
  networkPolicy: NetworkPolicy;
  loadDelay: number;
  timeouts: {
    openUrl: number;
    waitForElements: number;
    renderComplete: number;
  };
  viewport: any;
  zoom: any;
}

interface QueueConfig {
  indexInterval: string;
  pollEnabled: boolean;
  pollInterval: number;
  pollIntervalErrorMultiplier: number;
  timeout: number;
}

interface ScrollConfig {
  duration: string;
  size: number;
}

export interface ReportingConfigType {
  capture: CaptureConfig;
  csv: {
    scroll: ScrollConfig;
    enablePanelActionDownload: boolean;
    checkForFormulas: boolean;
    maxSizeBytes: number;
  };
  encryptionKey: string;
  kibanaServer: any;
  index: string;
  queue: QueueConfig;
  roles: any;
}

const addConfigDefaults = (
  server: Legacy.Server,
  core: CoreSetup,
  baseConfig: ReportingConfigType
) => {
  // encryption key
  let encryptionKey = baseConfig.encryptionKey;
  if (encryptionKey === undefined) {
    server.log(
      ['reporting', 'config', 'warning'],
      i18n.translate('xpack.reporting.selfCheckEncryptionKey.warning', {
        defaultMessage:
          `Generating a random key for {setting}. To prevent pending reports ` +
          `from failing on restart, please set {setting} in kibana.yml`,
        values: {
          setting: 'xpack.reporting.encryptionKey',
        },
      })
    );
    encryptionKey = crypto.randomBytes(16).toString('hex');
  }

  const { kibanaServer: reportingServer } = baseConfig;
  const serverInfo = core.http.getServerInfo();

  // kibanaServer.hostname, default to server.host, don't allow "0"
  let kibanaServerHostname = reportingServer.hostname ? reportingServer.hostname : serverInfo.host;
  if (kibanaServerHostname === '0') {
    server.log(
      ['reporting', 'config', 'warning'],
      i18n.translate('xpack.reporting.selfCheckHostname.warning', {
        defaultMessage:
          `Found 'server.host: "0"' in settings. This is incompatible with Reporting. ` +
          `To enable Reporting to work, '{setting}: 0.0.0.0' is being automatically to the configuration. ` +
          `You can change to 'server.host: 0.0.0.0' or add '{setting}: 0.0.0.0' in kibana.yml to prevent this message.`,
        values: {
          setting: 'xpack.reporting.kibanaServer.hostname',
        },
      })
    );
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

export const buildConfig = (
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
  reportingConfig = addConfigDefaults(server, core, reportingConfig);
  return {
    get: (...keys: string[]) => get(reportingConfig, keys.join('.'), null),
    kbnConfig: {
      get: (...keys: string[]) => get(kbnConfig, keys.join('.'), null),
    },
  };
};
