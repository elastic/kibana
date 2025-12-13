/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoreSetup,
  CoreStart,
  Plugin,
  Logger,
  PluginInitializerContext,
} from '@kbn/core/server';

import { PLUGIN } from '../common/constants';
import type { SetupDependencies, StartDependencies } from './types';
import { registerApiRoutes } from './routes';
import { License, handleEsError } from './shared_imports';

export class CrossClusterReplicationServerPlugin implements Plugin<void, void, any, any> {
  private readonly license: License;
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
    this.license = new License();
  }

  setup({ http }: CoreSetup, { features }: SetupDependencies) {
    this.license.setup({
      pluginName: PLUGIN.TITLE,
      logger: this.logger,
    });

    features.registerElasticsearchFeature({
      id: 'cross_cluster_replication',
      management: {
        data: ['cross_cluster_replication'],
      },
      privileges: [
        {
          requiredClusterPrivileges: ['manage', 'manage_ccr'],
          ui: [],
        },
      ],
    });

    registerApiRoutes({
      router: http.createRouter(),
      license: this.license,
      lib: {
        handleEsError,
      },
    });
  }

  start(core: CoreStart, { licensing }: StartDependencies) {
    this.license.start({
      pluginId: PLUGIN.ID,
      minimumLicenseType: PLUGIN.minimumLicenseType,
      licensing,
    });
  }

  stop() {}
}
