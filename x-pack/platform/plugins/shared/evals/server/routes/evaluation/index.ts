/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { EvalsRouter } from '../../types';
import type { EvaluatorRegistry } from '../../lib/evaluation_engine';
import { registerEvaluateRoute } from './evaluate';
import { registerPairwiseRoute } from './pairwise';
import { registerDeploymentGatesRoute } from './deployment_gates';

export interface EvaluationRouteDependencies {
  router: EvalsRouter;
  logger: Logger;
  evaluatorRegistry: EvaluatorRegistry;
}

export const registerEvaluationRoutes = (dependencies: EvaluationRouteDependencies) => {
  registerEvaluateRoute(dependencies);
  registerPairwiseRoute(dependencies);
  registerDeploymentGatesRoute(dependencies);
};
