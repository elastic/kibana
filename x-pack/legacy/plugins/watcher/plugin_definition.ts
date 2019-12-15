/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resolve } from 'path';
import { plugin } from './server/np_ready';
import { PLUGIN } from './common/constants';

export const pluginDefinition = {
  id: PLUGIN.ID,
  configPrefix: 'xpack.watcher',
  publicDir: resolve(__dirname, 'public'),
  require: ['kibana', 'elasticsearch', 'xpack_main'],
  uiExports: {
    styleSheetPaths: resolve(__dirname, 'public/np_ready/application/index.scss'),
    managementSections: ['plugins/watcher/legacy'],
    home: ['plugins/watcher/register_feature'],
  },
  init(server: any) {
    plugin({} as any).setup(server.newPlatform.setup.core, {
      __LEGACY: {
        route: server.route.bind(server),
        plugins: {
          watcher: server.plugins[PLUGIN.ID],
          xpack_main: server.plugins.xpack_main,
        },
      },
    });
  },
};
