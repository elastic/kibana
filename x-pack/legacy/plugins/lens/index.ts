/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as Joi from 'joi';
import { resolve } from 'path';
import { LegacyPluginInitializer } from 'src/legacy/types';
import { PLUGIN_ID, NOT_INTERNATIONALIZED_PRODUCT_NAME } from '../../../plugins/lens/common';

export const lens: LegacyPluginInitializer = kibana => {
  return new kibana.Plugin({
    id: PLUGIN_ID,
    configPrefix: `xpack.${PLUGIN_ID}`,
    // task_manager could be required, but is only used for telemetry
    require: ['kibana', 'elasticsearch', 'xpack_main', 'interpreter'],
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
    },

    config: () => {
      return Joi.object({
        enabled: Joi.boolean().default(true),
      }).default();
    },
  });
};
