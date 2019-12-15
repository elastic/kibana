/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  ServerFacade,
  ExportTypesRegistry,
  HeadlessChromiumDriverFactory,
  Logger,
} from '../../types';
import { registerJobGenerationRoutes } from './generation';
import { registerJobInfoRoutes } from './jobs';

export function registerRoutes(
  server: ServerFacade,
  exportTypesRegistry: ExportTypesRegistry,
  browserDriverFactory: HeadlessChromiumDriverFactory,
  logger: Logger
) {
  registerJobGenerationRoutes(server, exportTypesRegistry, browserDriverFactory, logger);
  registerJobInfoRoutes(server, exportTypesRegistry, logger);
}
