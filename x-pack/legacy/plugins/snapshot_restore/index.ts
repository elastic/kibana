/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Legacy } from 'kibana';
import { resolve } from 'path';
import { PluginInitializerContext } from 'src/core/server';

import { PLUGIN } from './common/constants';
import { plugin as initServerPlugin, Dependencies } from './server';

export type ServerFacade = Legacy.Server;

export function snapshotRestore(kibana: any) {
  return new kibana.Plugin({
    id: PLUGIN.id,
    configPrefix: 'xpack.snapshot_restore',
    publicDir: resolve(__dirname, 'public'),
    require: ['kibana', 'elasticsearch', 'xpack_main'],
    uiExports: {
      styleSheetPaths: resolve(__dirname, 'public/app/index.scss'),
      managementSections: ['plugins/snapshot_restore'],
      injectDefaultVars(server: Legacy.Server) {
        const config = server.config();
        return {
          slmUiEnabled: config.get('xpack.snapshot_restore.slm_ui.enabled'),
        };
      },
    },
    config(Joi: any) {
      return Joi.object({
        slm_ui: Joi.object({
          enabled: Joi.boolean().default(true),
        }).default(),

        enabled: Joi.boolean().default(true),
      }).default();
    },
    init(server: ServerFacade) {
      const coreSetup = server.newPlatform.setup.core;
      const { licensing, security } = server.newPlatform.setup.plugins;

      const coreInitializerContext = ({
        logger: server.newPlatform.coreContext.logger,
      } as unknown) as PluginInitializerContext;

      const pluginsSetup: Dependencies = {
        licensing: licensing as any,
        security: security as any,
      };

      const serverPlugin = initServerPlugin(coreInitializerContext as any);
      serverPlugin.setup(coreSetup, pluginsSetup);
    },
  });
}
