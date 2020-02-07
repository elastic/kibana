/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { CoreSetup } from 'src/core/server';
import { ElasticsearchPlugin } from 'src/legacy/core_plugins/elasticsearch';
import { Router } from '../../../server/lib/create_router';
import { addIndexManagementDataEnricher } from './index_management_data';
import { registerIndicesRoutes } from './routes/api/indices';
import { registerTemplateRoutes } from './routes/api/templates';
import { registerMappingRoute } from './routes/api/mapping';
import { registerSettingsRoutes } from './routes/api/settings';
import { registerStatsRoute } from './routes/api/stats';

export interface LegacySetup {
  router: Router;
  plugins: {
    elasticsearch: ElasticsearchPlugin;
    license: {
      registerLicenseChecker: () => void;
    };
  };
}

export interface IndexMgmtSetup {
  addIndexManagementDataEnricher: (enricher: any) => void;
}

export class IndexMgmtPlugin {
  public setup(core: CoreSetup, plugins: {}, __LEGACY: LegacySetup): IndexMgmtSetup {
    const serverFacade = {
      plugins: {
        elasticsearch: __LEGACY.plugins.elasticsearch,
      },
    };

    __LEGACY.plugins.license.registerLicenseChecker();

    registerIndicesRoutes(__LEGACY.router);
    registerTemplateRoutes(__LEGACY.router, serverFacade);
    registerSettingsRoutes(__LEGACY.router);
    registerStatsRoute(__LEGACY.router);
    registerMappingRoute(__LEGACY.router);

    return {
      addIndexManagementDataEnricher,
    };
  }
}
