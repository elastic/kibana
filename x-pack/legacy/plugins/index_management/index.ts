/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resolve } from 'path';
import { Legacy } from 'kibana';
import { PLUGIN } from './common/constants';
import { plugin as initServerPlugin, Dependencies } from './server/np_ready';

export type ServerFacade = Legacy.Server;

export function indexManagement(kibana: any) {
  return new kibana.Plugin({
    id: PLUGIN.id,
    configPrefix: 'xpack.index_management',
    publicDir: resolve(__dirname, 'public'),
    require: ['kibana', 'elasticsearch', 'xpack_main'],

    uiExports: {
      styleSheetPaths: resolve(__dirname, 'public/index.scss'),
      managementSections: ['plugins/index_management'],
    },

    init(server: ServerFacade) {
      const coreSetup = server.newPlatform.setup.core;

      const pluginDependencies: Dependencies = {
        elasticsearch: server.plugins.elasticsearch,
        licensing: {} as any,
      };

      const mockLogger = {
        get: () => ({
          info() {},
        }),
      };

      const serverPlugin = initServerPlugin({ logger: mockLogger } as any);
      const indexMgmtSetup = serverPlugin.setup(coreSetup, pluginDependencies);

      server.expose(
        'addIndexManagementDataEnricher',
        indexMgmtSetup.addIndexManagementDataEnricher
      );
    },
  });
}
