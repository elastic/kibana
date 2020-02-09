/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resolve } from 'path';
import { i18n } from '@kbn/i18n';
import { Legacy } from 'kibana';
import { createRouter } from '../../server/lib/create_router';
import { registerLicenseChecker } from '../../server/lib/register_license_checker';
import { PLUGIN, API_BASE_PATH } from './common/constants';
import { LegacySetup } from './server/plugin';
import { plugin as initServerPlugin } from './server';

export type ServerFacade = Legacy.Server;

export function indexManagement(kibana: any) {
  return new kibana.Plugin({
    id: PLUGIN.ID,
    configPrefix: 'xpack.index_management',
    publicDir: resolve(__dirname, 'public'),
    require: ['kibana', 'elasticsearch', 'xpack_main'],

    uiExports: {
      styleSheetPaths: resolve(__dirname, 'public/index.scss'),
      managementSections: ['plugins/index_management'],
    },

    init(server: ServerFacade) {
      const coreSetup = server.newPlatform.setup.core;

      const pluginsSetup = {};

      const __LEGACY: LegacySetup = {
        router: createRouter(server, PLUGIN.ID, `${API_BASE_PATH}/`),
        plugins: {
          license: {
            registerLicenseChecker: registerLicenseChecker.bind(
              null,
              server,
              PLUGIN.ID,
              PLUGIN.getI18nName(i18n),
              PLUGIN.MINIMUM_LICENSE_REQUIRED as 'basic'
            ),
          },
          elasticsearch: server.plugins.elasticsearch,
        },
      };

      const serverPlugin = initServerPlugin();
      const indexMgmtSetup = serverPlugin.setup(coreSetup, pluginsSetup, __LEGACY);

      server.expose(
        'addIndexManagementDataEnricher',
        indexMgmtSetup.addIndexManagementDataEnricher
      );
    },
  });
}
