/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as Joi from 'joi';
import { Server } from 'hapi';
import { resolve } from 'path';
import { LegacyPluginInitializer } from 'src/legacy/types';
import mappings from './mappings.json';

import { PLUGIN_ID } from './common';

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
      },
      styleSheetPaths: resolve(__dirname, 'public/index.scss'),
      mappings,
    },

    config: () => {
      return Joi.object({
        enabled: Joi.boolean().default(true),
      }).default();
    },

    init(server: Server) {
      server.plugins.xpack_main.registerFeature({
        id: PLUGIN_ID,
        name: NOT_INTERNATIONALIZED_PRODUCT_NAME,
        navLinkId: PLUGIN_ID,
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
            ui: ['show'],
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
    },
  });
};
