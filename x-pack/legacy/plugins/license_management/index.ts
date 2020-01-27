/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Legacy } from 'kibana';
import { resolve } from 'path';
import { PLUGIN } from './common/constants';
import { plugin } from './server/np_ready';

export function licenseManagement(kibana: any) {
  return new kibana.Plugin({
    id: PLUGIN.ID,
    configPrefix: 'xpack.license_management',
    publicDir: resolve(__dirname, 'public'),
    require: ['kibana', 'elasticsearch'],
    uiExports: {
      styleSheetPaths: resolve(__dirname, 'public/np_ready/application/index.scss'),
      managementSections: ['plugins/license_management/legacy'],
      injectDefaultVars(server: Legacy.Server) {
        const config = server.config();
        return {
          licenseManagementUiEnabled: config.get('xpack.license_management.ui.enabled'),
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
    init: (server: Legacy.Server) => {
      plugin({} as any).setup(server.newPlatform.setup.core, {
        ...server.newPlatform.setup.plugins,
        __LEGACY: {
          xpackMain: server.plugins.xpack_main,
          elasticsearch: server.plugins.elasticsearch,
        },
      });
    },
  });
}
