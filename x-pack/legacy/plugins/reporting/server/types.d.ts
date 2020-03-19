/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Legacy } from 'kibana';
import { ElasticsearchServiceSetup } from 'src/core/server';
import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import { PluginStart as DataPluginStart } from '../../../../../src/plugins/data/server';
import { SecurityPluginSetup } from '../../../../plugins/security/server';
import { XPackMainPlugin } from '../../xpack_main/server/xpack_main';
import { ReportingPluginSpecOptions } from '../types';

export interface ReportingSetupDeps {
  elasticsearch: ElasticsearchServiceSetup;
  security: SecurityPluginSetup;
  usageCollection: UsageCollectionSetup;
  __LEGACY: LegacySetup;
}

export interface ReportingStartDeps {
  elasticsearch: ElasticsearchServiceSetup;
  data: DataPluginStart;
  __LEGACY: LegacySetup;
}

export type ReportingSetup = object;

export type ReportingStart = object;

export interface LegacySetup {
  config: Legacy.Server['config'];
  info: Legacy.Server['info'];
  plugins: {
    elasticsearch: Legacy.Server['plugins']['elasticsearch'];
    xpack_main: XPackMainPlugin & {
      status?: any;
    };
    reporting: ReportingPluginSpecOptions;
  };
  route: Legacy.Server['route'];
}

export { ReportingCore } from './core';
