/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter, IBasePath } from 'src/core/server';
import { Logger } from '../../types';
import { ReportingCore, ReportingSetupDeps } from '../types';
import { registerJobGenerationRoutes } from './generation';
import { registerJobInfoRoutes } from './jobs';

export function registerRoutes(
  reporting: ReportingCore,
  plugins: ReportingSetupDeps,
  router: IRouter,
  basePath: IBasePath['get'],
  logger: Logger
) {
  registerJobGenerationRoutes(reporting, plugins, router, basePath, logger);
  registerJobInfoRoutes(reporting, plugins, router, basePath, logger);
}
