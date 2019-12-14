/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resolve } from 'path';
import { PLUGIN } from './common/constants';
import { registerLicenseChecker } from './server/lib/register_license_checker';
import { registerRoutes } from './server/routes/register_routes';
import { ccrDataEnricher } from './cross_cluster_replication_data';
import { addIndexManagementDataEnricher } from '../index_management/index_management_data';
export function crossClusterReplication(kibana) {
  return new kibana.Plugin({
    id: PLUGIN.ID,
    configPrefix: 'xpack.ccr',
    publicDir: resolve(__dirname, 'public'),
    require: ['kibana', 'elasticsearch', 'xpack_main', 'remote_clusters', 'index_management'],
    uiExports: {
      styleSheetPaths: resolve(__dirname, 'public/index.scss'),
      managementSections: ['plugins/cross_cluster_replication'],
      injectDefaultVars(server) {
        const config = server.config();
        return {
          ccrUiEnabled:
            config.get('xpack.ccr.ui.enabled') && config.get('xpack.remote_clusters.ui.enabled'),
        };
      },
    },

    config(Joi) {
      return Joi.object({
        // display menu item
        ui: Joi.object({
          enabled: Joi.boolean().default(true),
        }).default(),

        // enable plugin
        enabled: Joi.boolean().default(true),
      }).default();
    },
    isEnabled(config) {
      return (
        config.get('xpack.ccr.enabled') &&
        config.get('xpack.index_management.enabled') &&
        config.get('xpack.remote_clusters.enabled')
      );
    },
    init: function initCcrPlugin(server) {
      registerLicenseChecker(server);
      registerRoutes(server);
      if (server.config().get('xpack.ccr.ui.enabled')) {
        addIndexManagementDataEnricher(ccrDataEnricher);
      }
    },
  });
}
