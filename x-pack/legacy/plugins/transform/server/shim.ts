/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Legacy } from 'kibana';
import { createRouter, Router } from '../../../server/lib/create_router';
import { registerLicenseChecker } from '../../../server/lib/register_license_checker';
import { elasticsearchJsPlugin } from './client/elasticsearch_transform';
export interface Core {
  http: {
    createRouter(basePath: string): Router;
  };
}

export interface Plugins {
  license: {
    registerLicenseChecker: typeof registerLicenseChecker;
  };
  xpack_main: any;
  elasticsearch: any;
}

export function createServerShim(
  server: Legacy.Server,
  pluginId: string
): { core: Core; plugins: Plugins } {
  return {
    core: {
      http: {
        createRouter: (basePath: string) =>
          createRouter(server, pluginId, basePath, {
            plugins: [elasticsearchJsPlugin],
          }),
      },
    },
    plugins: {
      license: {
        registerLicenseChecker,
      },
      xpack_main: server.plugins.xpack_main,
      elasticsearch: server.plugins.elasticsearch,
    },
  };
}
