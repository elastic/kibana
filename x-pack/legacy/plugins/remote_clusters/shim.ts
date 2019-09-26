/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Legacy } from 'kibana';
import { createRouter, isEsErrorFactory, Router } from '../../server/lib/create_router';
import { registerLicenseChecker } from '../../server/lib/register_license_checker';

export interface CoreSetup {
  http: {
    createRouter(basePath: string): Router;
    isEsError(error: any): boolean;
  };
}

export interface Plugins {
  license: {
    registerLicenseChecker: typeof registerLicenseChecker;
  };
}

export function createShim(
  server: Legacy.Server,
  pluginId: string
): { coreSetup: CoreSetup; pluginsSetup: Plugins } {
  return {
    coreSetup: {
      http: {
        createRouter: (basePath: string) => createRouter(server, pluginId, basePath),
        isEsError: isEsErrorFactory(server),
      },
    },
    pluginsSetup: {
      license: {
        registerLicenseChecker,
      },
    },
  };
}
