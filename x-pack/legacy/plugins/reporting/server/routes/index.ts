/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ReportingCore } from '../';
import { LevelLogger as Logger } from '../lib';
import { ReportingSetupDeps, ServerFacade } from '../types';
import { registerJobGenerationRoutes } from './generation';
import { registerJobInfoRoutes } from './jobs';

export function registerRoutes(
  reporting: ReportingCore,
  server: ServerFacade,
  plugins: ReportingSetupDeps,
  logger: Logger
) {
  registerJobGenerationRoutes(reporting, server, plugins, logger);
  registerJobInfoRoutes(reporting, server, plugins, logger);
}
