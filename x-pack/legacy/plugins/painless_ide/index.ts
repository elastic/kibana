/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Legacy } from 'kibana';
import { resolve } from 'path';

import { PLUGIN } from './common/constants';
import { plugin as initServerPlugin } from './server';
import { createShim } from './server/legacy';

export function painlessIde(kibana: any) {
  return new kibana.Plugin({
    id: PLUGIN.ID,
    publicDir: resolve(__dirname, 'public'),
    require: ['kibana', 'elasticsearch', 'xpack_main'],
    uiExports: {
      styleSheetPaths: resolve(__dirname, 'public/app/index.scss'),
      managementSections: ['plugins/painless_ide'],
    },
    init(server: Legacy.Server) {
      const { coreSetup, pluginsSetup } = createShim(server, PLUGIN.ID);
      const serverPlugin = initServerPlugin();
      serverPlugin.setup(coreSetup, pluginsSetup);
    },
  });
}
