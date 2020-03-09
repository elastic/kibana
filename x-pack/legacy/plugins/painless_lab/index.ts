/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { resolve } from 'path';
import { PLUGIN_ID } from './common/constants';

export const painlessLab = (kibana: any) =>
  new kibana.Plugin({
    id: PLUGIN_ID,
    publicDir: resolve(__dirname, 'public'),
    require: ['kibana', 'elasticsearch', 'xpack_main'],
    configPrefix: 'xpack.painless_lab',
    config(Joi: any) {
      return Joi.object({
        enabled: Joi.boolean().default(true),
      }).default();
    },
    uiExports: {
      styleSheetPaths: resolve(__dirname, 'public/index.scss'),
      devTools: [resolve(__dirname, 'public/register')],
    },
    init: () => {},
  });
