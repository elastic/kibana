/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  ExportTypesRegistry,
  HeadlessChromiumDriverFactory,
  Logger,
  ServerFacade,
} from '../../types';
import { ReportingSetupDeps } from '../plugin';
import { registerJobGenerationRoutes } from './generation';
import { registerJobInfoRoutes } from './jobs';

export function registerRoutes(
  server: ServerFacade,
  plugins: ReportingSetupDeps,
  exportTypesRegistry: ExportTypesRegistry,
  browserDriverFactory: HeadlessChromiumDriverFactory,
  logger: Logger
) {
  registerJobGenerationRoutes(server, plugins, exportTypesRegistry, browserDriverFactory, logger);
  registerJobInfoRoutes(server, plugins, exportTypesRegistry, logger);
}
