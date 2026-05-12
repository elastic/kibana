/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { EvalsRequestHandlerContext } from '../../types';
import type { SkillOnlineEvalService } from '../../lib/aesop/skill_online_eval_service';
import { registerListSkillsRoute } from './list_skills';
import { registerSkillGenerateEvalDatasetRoute } from './generate_eval_dataset';
import { registerSkillRunOnlineEvalRoute } from './run_online_eval';
import { registerSkillProposeEvaluatorsRoute } from './propose_evaluators';
import { registerSkillGetDatasetStatusRoute } from './get_dataset_status';
import { registerHarvestFailuresRoute } from './harvest_failures';
import { registerSkillGetOnlineEvalStatusRoute } from './get_online_eval_status';
import { registerSkillSuggestImprovementsRoute } from './suggest_improvements';
import { registerSkillGenerateImprovementRoute } from './generate_improvement';

export interface SkillRouteDependencies {
  router: IRouter<EvalsRequestHandlerContext>;
  logger: Logger;
  skillOnlineEvalService?: SkillOnlineEvalService;
}

export const registerSkillRoutes = (deps: SkillRouteDependencies) => {
  registerListSkillsRoute(deps);
  registerSkillGenerateEvalDatasetRoute(deps);
  registerSkillRunOnlineEvalRoute(deps);
  registerSkillProposeEvaluatorsRoute(deps);
  registerSkillGetDatasetStatusRoute(deps);
  registerSkillGetOnlineEvalStatusRoute(deps);
  registerHarvestFailuresRoute(deps);
  registerSkillSuggestImprovementsRoute(deps);
  registerSkillGenerateImprovementRoute(deps);
};
