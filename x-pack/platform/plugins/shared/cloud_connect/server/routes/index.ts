/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter, Logger, StartServicesAccessor } from '@kbn/core/server';
import type { EncryptedSavedObjectsPluginStart } from '@kbn/encrypted-saved-objects-plugin/server';
import { registerAuthenticateRoute } from './authenticate';
import { registerClustersRoute } from './clusters';
import { registerRotateApiKeyRoute } from './rotate_api_key';

interface CloudConnectedStartDeps {
  encryptedSavedObjects: EncryptedSavedObjectsPluginStart;
}

export interface RouteOptions {
  router: IRouter;
  logger: Logger;
  getStartServices: StartServicesAccessor<CloudConnectedStartDeps, unknown>;
  hasEncryptedSOEnabled: boolean;
  cloudApiUrl: string;
}

export function registerRoutes(options: RouteOptions) {
  registerAuthenticateRoute(options);
  registerClustersRoute(options);
  registerRotateApiKeyRoute(options);
}
