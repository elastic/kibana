/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as Joi from 'joi';
import { resolve } from 'path';
import { LegacyPluginInitializer } from 'src/legacy/types';
import KbnServer, { Server } from 'src/legacy/server/kbn_server';
import { CoreSetup } from 'src/core/server';
import mappings from './mappings.json';
import { PLUGIN_ID, getEditPath, BASE_API_URL } from './common';
import { LensServer } from './server';

const NOT_INTERNATIONALIZED_PRODUCT_NAME = 'Lens Visualizations';

export const lens: LegacyPluginInitializer = kibana => {
  return new kibana.Plugin({
    id: PLUGIN_ID,
    configPrefix: `xpack.${PLUGIN_ID}`,
    require: ['kibana', 'elasticsearch', 'xpack_main', 'interpreter', 'data'],
    publicDir: resolve(__dirname, 'public'),

    uiExports: {
      app: {
        title: NOT_INTERNATIONALIZED_PRODUCT_NAME,
        description: 'Explore and visualize data.',
        main: `plugins/${PLUGIN_ID}/index`,
        listed: false,
      },
      embeddableFactories: ['plugins/lens/register_embeddable'],
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

      server.plugins.xpack_main.registerFeature({
        id: PLUGIN_ID,
        name: NOT_INTERNATIONALIZED_PRODUCT_NAME,
        app: [PLUGIN_ID, 'kibana'],
        catalogue: [PLUGIN_ID],
        privileges: {
          all: {
            api: [PLUGIN_ID],
            catalogue: [PLUGIN_ID],
            savedObject: {
              all: [],
              read: [],
            },
            ui: ['save', 'show'],
          },
          read: {
            api: [PLUGIN_ID],
            catalogue: [PLUGIN_ID],
            savedObject: {
              all: [],
              read: [],
            },
            ui: ['show'],
          },
        },
      });

      // Set up with the new platform plugin lifecycle API.
      const plugin = new LensServer(server.savedObjects.getScopedSavedObjectsClient);
      plugin.setup(({
        http: {
          ...kbnServer.newPlatform.setup.core.http,
          createRouter: () => kbnServer.newPlatform.setup.core.http.createRouter(BASE_API_URL),
        },
      } as unknown) as CoreSetup);

      server.events.on('stop', () => {
        plugin.stop();
      });
    },
  });
};
