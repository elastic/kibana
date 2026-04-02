/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { EvalsRouter } from '../../types';
import type { EvaluatorRegistry } from '../../lib/evaluation_engine';
import { registerListEvaluatorsRoute } from './list_evaluators';
import { registerCreateEvaluatorRoute } from './create_evaluator';
import { registerGetEvaluatorRoute } from './get_evaluator';
import { registerUpdateEvaluatorRoute } from './update_evaluator';
import { registerDeleteEvaluatorRoute } from './delete_evaluator';
import { registerTestEvaluatorRoute } from './test_evaluator';

export interface EvaluatorRouteDependencies {
  router: EvalsRouter;
  logger: Logger;
  evaluatorRegistry: EvaluatorRegistry;
}

export const registerEvaluatorRoutes = (dependencies: EvaluatorRouteDependencies) => {
  registerListEvaluatorsRoute(dependencies);
  registerCreateEvaluatorRoute(dependencies);
  registerGetEvaluatorRoute(dependencies);
  registerUpdateEvaluatorRoute(dependencies);
  registerDeleteEvaluatorRoute(dependencies);
  registerTestEvaluatorRoute(dependencies);
};
