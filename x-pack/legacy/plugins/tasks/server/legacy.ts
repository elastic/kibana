/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Legacy } from 'kibana';
import { i18n } from '@kbn/i18n';

import { createRouter, Router } from '../../../server/lib/create_router';
import { registerLicenseChecker } from '../../../server/lib/register_license_checker';
import { PLUGIN } from '../common/constants';

export interface CoreSetup {
  __LEGACY: {
    i18n: {
      [key: string]: any;
    };
    http: {
      createRouter(basePath: string): Router;
    };
  };
}

export interface PluginsSetup {
  __LEGACY: {
    license: {
      registerLicenseChecker(): void;
    };
    xpack_main: any;
    elasticsearch: any;
  };
}

export const createShim = (
  server: Legacy.Server,
  pluginId: string
): { coreSetup: CoreSetup; pluginsSetup: PluginsSetup } => {
  const coreSetup: CoreSetup = {
    __LEGACY: {
      i18n,
      http: {
        createRouter: (basePath: string) => createRouter(server, pluginId, basePath),
      },
    },
  };

  const pluginsSetup: PluginsSetup = {
    __LEGACY: {
      license: {
        registerLicenseChecker: registerLicenseChecker.bind(
          null,
          server,
          PLUGIN.ID,
          PLUGIN.getI18nName(coreSetup.__LEGACY.i18n),
          PLUGIN.MINIMUM_LICENSE_REQUIRED
        ),
      },
      xpack_main: server.plugins.xpack_main,
      elasticsearch: server.plugins.elasticsearch,
    },
  };

  return { coreSetup, pluginsSetup };
};
