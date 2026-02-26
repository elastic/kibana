/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import { registerGetRunsRoute } from './runs/get_runs';
import { registerGetRunRoute } from './runs/get_run';
import { registerGetRunScoresRoute } from './runs/get_run_scores';
import { registerGetTraceRoute } from './traces/get_trace';

export interface RouteDependencies {
  router: IRouter;
  logger: Logger;
}

export const registerRoutes = (dependencies: RouteDependencies) => {
  registerGetRunsRoute(dependencies);
  registerGetRunRoute(dependencies);
  registerGetRunScoresRoute(dependencies);
  registerGetTraceRoute(dependencies);
};
