/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Legacy } from 'kibana';
import { resolve } from 'path';
import { PLUGIN } from './common';
import { Plugin as RemoteClustersPlugin } from './plugin';
import { createShim } from './shim';

export function remoteClusters(kibana: any) {
  return new kibana.Plugin({
    id: PLUGIN.ID,
    configPrefix: 'xpack.remote_clusters',
    publicDir: resolve(__dirname, 'public'),
    // xpack_main is required for license checking.
    require: ['kibana', 'elasticsearch', 'xpack_main', 'index_management'],
    uiExports: {
      styleSheetPaths: resolve(__dirname, 'public/index.scss'),
      managementSections: ['plugins/remote_clusters'],
      injectDefaultVars(server: Legacy.Server) {
        const config = server.config();
        return {
          remoteClustersUiEnabled: config.get('xpack.remote_clusters.ui.enabled'),
        };
      },
    },
    config(Joi: any) {
      return Joi.object({
        // display menu item
        ui: Joi.object({
          enabled: Joi.boolean().default(true),
        }).default(),

        // enable plugin
        enabled: Joi.boolean().default(true),
      }).default();
    },
    isEnabled(config: any) {
      return (
        config.get('xpack.remote_clusters.enabled') && config.get('xpack.index_management.enabled')
      );
    },
    init(server: Legacy.Server) {
      const {
        coreSetup,
        pluginsSetup: {
          license: { registerLicenseChecker },
        },
      } = createShim(server, PLUGIN.ID);

      const remoteClustersPlugin = new RemoteClustersPlugin();

      // Set up plugin.
      remoteClustersPlugin.setup(coreSetup);

      registerLicenseChecker(
        server,
        PLUGIN.ID,
        PLUGIN.getI18nName(),
        PLUGIN.MINIMUM_LICENSE_REQUIRED
      );
    },
  });
}
