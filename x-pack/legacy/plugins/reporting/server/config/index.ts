/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Legacy } from 'kibana';
import { get } from 'lodash';
import { CoreSetup } from 'src/core/server';
import { ConfigType as ReportingConfigType } from '../../../../../plugins/reporting/server';

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

  return {
    get: (...keys: string[]) => get(reportingConfig, keys.join('.'), null), // spreading arguments as an array allows the return type to be known by the compiler
    kbnConfig: {
      get: (...keys: string[]) => get(kbnConfig, keys.join('.'), null),
    },
  };
};

export { ReportingConfigType };
