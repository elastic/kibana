/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Legacy } from 'kibana';
import { i18n } from '@kbn/i18n';

import { createRouter, Router } from '../../../server/lib/create_router';
import { registerLicenseChecker } from '../../../server/lib/register_license_checker';
import { elasticSearchJsClient } from '../server/elasticsearch_js_client';
import { PLUGIN } from '../common/constants';

export interface Core {
  i18n: {
    [key: string]: any;
  };
  http: {
    serverRouter: {
      create(basePath: string): Router;
    };
  };
}

export interface Plugins {
  license: {
    registerLicenseChecker(): void;
  };
  xpack_main: any;
  elasticsearch: any;
}

export const createShim = (server: Legacy.Server): { core: Core; plugins: Plugins } => {
  const core: Core = {
    i18n,
    http: {
      serverRouter: {
        create: (basePath: string) =>
          createRouter(server, PLUGIN.ID, basePath, { plugins: [elasticSearchJsClient] }),
      },
    },
  };

  const plugins: Plugins = {
    license: {
      registerLicenseChecker: registerLicenseChecker.bind(
        null,
        server,
        PLUGIN.ID,
        PLUGIN.getI18nName(core.i18n),
        PLUGIN.MINIMUM_LICENSE_REQUIRED
      ),
    },
    xpack_main: server.plugins.xpack_main,
    elasticsearch: server.plugins.elasticsearch,
  };

  return { core, plugins };
};
