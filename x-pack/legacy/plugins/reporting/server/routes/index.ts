/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Logger, ServerFacade } from '../../types';
import { ReportingSetupDeps, ReportingPlugin } from '../plugin';
import { registerJobGenerationRoutes } from './generation';
import { registerJobInfoRoutes } from './jobs';

export function registerRoutes(
  reporting: ReportingPlugin,
  server: ServerFacade,
  plugins: ReportingSetupDeps,
  logger: Logger
) {
  registerJobGenerationRoutes(reporting, server, plugins, logger);
  registerJobInfoRoutes(reporting, server, plugins, logger);
}
