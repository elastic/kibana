/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as Joi from 'joi';
import { resolve } from 'path';
import { LegacyPluginInitializer } from 'src/legacy/types';
import KbnServer, { Server } from 'src/legacy/server/kbn_server';
import mappings from './mappings.json';
import { PLUGIN_ID, getEditPath, NOT_INTERNATIONALIZED_PRODUCT_NAME } from './common';
import { lensServerPlugin } from './server';
import { getTaskManagerSetup, getTaskManagerStart } from '../task_manager/server';

export const lens: LegacyPluginInitializer = kibana => {
  return new kibana.Plugin({
    id: PLUGIN_ID,
    configPrefix: `xpack.${PLUGIN_ID}`,
    // task_manager could be required, but is only used for telemetry
    require: ['kibana', 'elasticsearch', 'xpack_main', 'interpreter', 'data'],
    publicDir: resolve(__dirname, 'public'),

    uiExports: {
      app: {
        title: NOT_INTERNATIONALIZED_PRODUCT_NAME,
        description: 'Explore and visualize data.',
        main: `plugins/${PLUGIN_ID}/redirect`,
        listed: false,
      },
      visualize: [`plugins/${PLUGIN_ID}/legacy`],
      embeddableFactories: [`plugins/${PLUGIN_ID}/legacy`],
      styleSheetPaths: resolve(__dirname, 'public/index.scss'),
      mappings,
      visTypes: ['plugins/lens/register_vis_type_alias'],
      savedObjectsManagement: {
        lens: {
          defaultSearchField: 'title',
          isImportableAndExportable: true,
          getTitle: (obj: { attributes: { title: string } }) => obj.attributes.title,
          getInAppUrl: (obj: { id: string }) => ({
            path: getEditPath(obj.id),
            uiCapabilitiesPath: 'lens.show',
          }),
        },
      },
    },

    config: () => {
      return Joi.object({
        enabled: Joi.boolean().default(true),
      }).default();
    },

    init(server: Server) {
      const kbnServer = (server as unknown) as KbnServer;

      // Set up with the new platform plugin lifecycle API.
      const plugin = lensServerPlugin();
      const { usageCollection } = server.newPlatform.setup.plugins;

      plugin.setup(kbnServer.newPlatform.setup.core, {
        usageCollection,
        // Legacy APIs
        savedObjects: server.savedObjects,
        config: server.config(),
        server,
        taskManager: getTaskManagerSetup(server)!,
      });

      plugin.start(kbnServer.newPlatform.start.core, {
        server,
        taskManager: getTaskManagerStart(server)!,
      });

      server.events.on('stop', () => {
        plugin.stop();
      });
    },
  });
};
