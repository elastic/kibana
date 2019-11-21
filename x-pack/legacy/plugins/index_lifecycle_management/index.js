/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resolve } from 'path';
import { registerTemplatesRoutes } from './server/routes/api/templates';
import { registerNodesRoutes } from './server/routes/api/nodes';
import { registerPoliciesRoutes } from './server/routes/api/policies';
import { registerIndexRoutes } from './server/routes/api/index';
import { registerLicenseChecker } from './server/lib/register_license_checker';
import { PLUGIN_ID } from './common/constants';
import { indexLifecycleDataEnricher } from './index_lifecycle_data';

export function indexLifecycleManagement(kibana) {
  return new kibana.Plugin({
    config: (Joi) => {
      return Joi.object({
        enabled: Joi.boolean().default(true),
        ui: Joi.object({
          enabled: Joi.boolean().default(true),
        }).default(),
        filteredNodeAttributes: Joi.array().items(Joi.string()).default([])
      }).default();
    },
    id: PLUGIN_ID,
    publicDir: resolve(__dirname, 'public'),
    configPrefix: 'xpack.ilm',
    require: ['kibana', 'elasticsearch', 'xpack_main', 'index_management'],
    uiExports: {
      styleSheetPaths: resolve(__dirname, 'public/index.scss'),
      managementSections: ['plugins/index_lifecycle_management'],
      injectDefaultVars(server) {
        const config = server.config();
        return {
          ilmUiEnabled: config.get('xpack.ilm.ui.enabled')
        };
      },
    },
    isEnabled(config) {
      return (
        config.get('xpack.ilm.enabled') &&
        config.has('xpack.index_management.enabled') &&
        config.get('xpack.index_management.enabled')
      );
    },
    init: function (server) {
      registerLicenseChecker(server);
      registerTemplatesRoutes(server);
      registerNodesRoutes(server);
      registerPoliciesRoutes(server);
      registerIndexRoutes(server);

      if (
        server.config().get('xpack.ilm.ui.enabled') &&
        server.plugins.index_management &&
        server.plugins.index_management.addIndexManagementDataEnricher
      ) {
        server.plugins.index_management.addIndexManagementDataEnricher(indexLifecycleDataEnricher);
      }
    },
  });
}
