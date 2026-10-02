/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DashboardAgentEvaluator, DashboardRoute } from '../evaluate_dataset';
import { skippedResult } from '../evaluator_utils';
import {
  dashboardSkillActivatedEvaluator,
  dashboardSkillNotActivatedEvaluator,
  visualizationSkillWithoutDashboardEvaluator,
} from '../skill_selection_evaluators';

export const DASHBOARD_ROUTING_EVALUATOR_NAME = 'Dashboard Skill Routing';

const EVALUATOR_BY_ROUTE: Record<DashboardRoute, DashboardAgentEvaluator> = {
  dashboard: dashboardSkillActivatedEvaluator,
  visualization: visualizationSkillWithoutDashboardEvaluator,
  none: dashboardSkillNotActivatedEvaluator,
};

/** Did the request reach the skill the gold `route` names, and only that one? */
export const dashboardRoutingEvaluator: DashboardAgentEvaluator = {
  name: DASHBOARD_ROUTING_EVALUATOR_NAME,
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async (params) => {
    const route = params.expected?.route;
    if (!route) {
      return skippedResult('No gold route.');
    }
    const result = await EVALUATOR_BY_ROUTE[route].evaluate(params);
    return { ...result, metadata: { ...result.metadata, route } };
  },
};
