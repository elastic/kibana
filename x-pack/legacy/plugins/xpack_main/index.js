/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resolve } from 'path';
import { mirrorPluginStatus } from '../../server/lib/mirror_plugin_status';
import { setupXPackMain } from './server/lib/setup_xpack_main';
import { xpackInfoRoute } from './server/routes/api/v1';

export const xpackMain = (kibana) => {
  return new kibana.Plugin({
    id: 'xpack_main',
    configPrefix: 'xpack.xpack_main',
    publicDir: resolve(__dirname, 'public'),
    require: ['elasticsearch'],

    config(Joi) {
      return Joi.object({
        enabled: Joi.boolean().default(true),
      }).default();
    },

    init(server) {
      mirrorPluginStatus(server.plugins.elasticsearch, this, 'yellow', 'red');

      setupXPackMain(server);

      // register routes
      xpackInfoRoute(server);
    },
  });
};
