/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter, Logger } from '@kbn/core/server';
import type { AutomaticImportV2PluginRequestHandlerContext } from '../types';
import { registerIntegrationRoutes } from './integrations_route';
import { registerDataStreamRoutes } from './data_stream_routes';

export function registerRoutes(
  router: IRouter<AutomaticImportV2PluginRequestHandlerContext>,
  logger: Logger
) {
  registerIntegrationRoutes(router, logger);
  registerDataStreamRoutes(router, logger);
}
