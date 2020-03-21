/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Plugin, PluginInitializerContext, CoreSetup } from 'src/core/server';

import { IndexMgmtSetup } from '../../../../../plugins/index_management/server';

// @ts-ignore
import { registerLicenseChecker } from './lib/register_license_checker';
// @ts-ignore
import { registerRoutes } from './routes/register_routes';
import { ccrDataEnricher } from './cross_cluster_replication_data';

interface PluginDependencies {
  indexManagement: IndexMgmtSetup;
  __LEGACY: {
    server: any;
    ccrUIEnabled: boolean;
  };
}

export class CrossClusterReplicationServerPlugin implements Plugin {
  // @ts-ignore
  constructor(private readonly ctx: PluginInitializerContext) {}
  setup({ http }: CoreSetup, { indexManagement, __LEGACY }: PluginDependencies) {
    registerLicenseChecker(__LEGACY);

    const router = http.createRouter();
    registerRoutes({ router, __LEGACY });
    if (__LEGACY.ccrUIEnabled && indexManagement && indexManagement.indexDataEnricher) {
      indexManagement.indexDataEnricher.add(ccrDataEnricher);
    }
  }
  start() {}
}
