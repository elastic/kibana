/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resolve } from 'path';
import { createRouter } from '../../server/lib/create_router';
import { registerIndicesRoutes } from './server/routes/api/indices';
import { registerTemplateRoutes } from './server/routes/api/templates';
import { registerMappingRoute } from './server/routes/api/mapping';
import { registerSettingsRoutes } from './server/routes/api/settings';
import { registerStatsRoute } from './server/routes/api/stats';
import { registerLicenseChecker } from '../../server/lib/register_license_checker';
import { PLUGIN } from './common/constants';
import { addIndexManagementDataEnricher } from './index_management_data';

export function indexManagement(kibana) {
  return new kibana.Plugin({
    id: PLUGIN.ID,
    configPrefix: 'xpack.index_management',
    publicDir: resolve(__dirname, 'public'),
    require: ['kibana', 'elasticsearch', 'xpack_main'],
    uiExports: {
      styleSheetPaths: resolve(__dirname, 'public/index.scss'),
      managementSections: ['plugins/index_management'],
    },
    init: function(server) {
      const router = createRouter(server, PLUGIN.ID, '/api/index_management/');
      server.expose('addIndexManagementDataEnricher', addIndexManagementDataEnricher);
      registerLicenseChecker(server, PLUGIN.ID, PLUGIN.NAME, PLUGIN.MINIMUM_LICENSE_REQUIRED);
      registerIndicesRoutes(router);
      registerTemplateRoutes(router, server);
      registerSettingsRoutes(router);
      registerStatsRoute(router);
      registerMappingRoute(router);
    },
  });
}
