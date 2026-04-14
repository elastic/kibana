/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { EvalsRequestHandlerContext } from '../../types';
import type { SuiteRunner } from '../../lib/suite_runner';
import { registerListSuitesRoute } from './list_suites';
import { registerRunSuiteRoute } from './run_suite';
import { registerGetSuiteStatusRoute } from './get_suite_status';
import { registerGetSuiteRunsRoute } from './get_suite_runs';

export interface SuiteRouteDependencies {
  router: IRouter<EvalsRequestHandlerContext>;
  logger: Logger;
  suiteRunner?: SuiteRunner;
  repoRoot: string;
}

export const registerSuiteRoutes = (deps: SuiteRouteDependencies): void => {
  registerListSuitesRoute(deps);
  registerRunSuiteRoute(deps);
  registerGetSuiteStatusRoute(deps);
  registerGetSuiteRunsRoute(deps);
};
