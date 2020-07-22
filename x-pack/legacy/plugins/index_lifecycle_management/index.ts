/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Legacy } from 'kibana';
import { resolve } from 'path';
import { PLUGIN } from './common/constants';
import { Plugin as IndexLifecycleManagementPlugin } from './plugin';
import { createShim } from './shim';

export function indexLifecycleManagement(kibana: any) {
  return new kibana.Plugin({
    id: PLUGIN.ID,
    configPrefix: 'xpack.ilm',
    publicDir: resolve(__dirname, 'public'),
    require: ['kibana', 'elasticsearch', 'xpack_main', 'index_management'],
    uiExports: {
      styleSheetPaths: resolve(__dirname, 'public/np_ready/application/index.scss'),
      managementSections: ['plugins/index_lifecycle_management/legacy'],
      injectDefaultVars(server: Legacy.Server) {
        const config = server.config();
        return {
          ilmUiEnabled: config.get('xpack.ilm.ui.enabled'),
        };
      },
    },
    config: (Joi: any) => {
      return Joi.object({
        // display menu item
        ui: Joi.object({
          enabled: Joi.boolean().default(true),
        }).default(),

        // enable plugin
        enabled: Joi.boolean().default(true),

        filteredNodeAttributes: Joi.array().items(Joi.string()).default([]),
      }).default();
    },
    isEnabled(config: any) {
      return (
        config.get('xpack.ilm.enabled') &&
        config.has('xpack.index_management.enabled') &&
        config.get('xpack.index_management.enabled')
      );
    },
    init(server: Legacy.Server) {
      const core = server.newPlatform.setup.core;
      const plugins = {};
      const __LEGACY = createShim(server);

      const indexLifecycleManagementPlugin = new IndexLifecycleManagementPlugin();

      // Set up plugin.
      indexLifecycleManagementPlugin.setup(core, plugins, __LEGACY);
    },
  });
}
