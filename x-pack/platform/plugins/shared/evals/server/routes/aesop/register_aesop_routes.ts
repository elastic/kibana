/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { EvalsRequestHandlerContext } from '../../types';
import { registerRunExplorationRoute } from './run_exploration';
import { registerListProposedSkillsRoute } from './list_proposed_skills';
import { registerApproveSkillRoute } from './approve_skill';
import { registerRejectSkillRoute } from './reject_skill';
import { registerRunSkillValidationRoute } from './run_skill_validation';
import { registerGetExplorationProgressRoute } from './get_exploration_progress';
import { registerGetExecutionDetailRoute } from './get_execution_detail';
import { registerDeployMonitoringDashboardRoute } from './deploy_monitoring_dashboard';
import { registerDeployAlertingRulesRoute } from './deploy_alerting_rules';
import { registerGetExplorationHistoryRoute } from './get_exploration_history';
import { registerUpdateSkillRoute } from './update_skill';
import { registerImproveSkillRoute } from './improve_skill';
import { registerUnrejectSkillRoute } from './unreject_skill';
import { registerRedeploySkillRoute } from './redeploy_skill';
import { registerGetSkillDetailRoute } from './get_skill_detail';
import { registerGenerateEvalDatasetRoute } from './generate_eval_dataset';
import { registerRunOnlineEvalRoute } from './run_online_eval';
import { registerProposeEvaluatorsRoute } from './propose_evaluators';
import type { SkillOnlineEvalService } from '../../lib/aesop/skill_online_eval_service';
import type { SkillValidationService } from '../../lib/aesop/skill_validation_service';
import type { EvaluatorRegistry } from '../../lib/evaluation_engine';

export interface AESOPRouteDependencies {
  router: IRouter<EvalsRequestHandlerContext>;
  logger: Logger;
  skillOnlineEvalService?: SkillOnlineEvalService;
  skillValidationService?: SkillValidationService;
  evaluatorRegistry?: EvaluatorRegistry;
}

/**
 * Registers all AESOP-related API routes (PRODUCTION).
 *
 * Routes:
 * - POST /internal/aesop/exploration/run - Trigger self-exploration workflow
 * - GET /internal/aesop/exploration/{executionId}/progress - Get real-time workflow progress
 * - GET /internal/aesop/skills/proposed - List proposed skills (with filtering)
 * - POST /internal/aesop/skills/{skillId}/validate - Run validation workflow
 * - POST /internal/aesop/skills/{skillId}/approve - Approve skill → deploy to Agent Builder
 * - POST /internal/aesop/skills/{skillId}/reject - Reject skill with feedback
 * - POST /internal/aesop/monitoring/dashboard/deploy - Deploy performance monitoring dashboard
 * - POST /internal/aesop/monitoring/alerts/deploy - Deploy alerting rules
 *
 * Production features:
 * - Comprehensive error handling (custom error classes)
 * - Input sanitization (prevent injection attacks)
 * - Audit logging (all operations logged)
 * - Performance monitoring (duration tracking)
 * - Real-time progress tracking (2-second polling)
 * - APM instrumentation (custom metrics)
 */
export function registerAESOPRoutes(deps: AESOPRouteDependencies) {
  const { router, logger } = deps;
  registerRunExplorationRoute(deps);
  registerGetExplorationHistoryRoute({ router, logger });
  registerGetExplorationProgressRoute({ router, logger });
  registerGetExecutionDetailRoute({ router, logger });
  registerListProposedSkillsRoute({ router, logger });
  registerRunSkillValidationRoute({
    router,
    logger,
    evaluatorRegistry: deps.evaluatorRegistry,
  });
  registerUpdateSkillRoute({ router, logger });
  registerImproveSkillRoute({ router, logger });
  registerApproveSkillRoute({ router, logger });
  registerRejectSkillRoute({ router, logger });
  registerUnrejectSkillRoute({ router, logger });
  registerRedeploySkillRoute({ router, logger });
  registerGetSkillDetailRoute({ router, logger });
  registerDeployMonitoringDashboardRoute({ router, logger });
  registerDeployAlertingRulesRoute({ router, logger });
  registerGenerateEvalDatasetRoute({ router, logger });
  registerRunOnlineEvalRoute(deps);
  registerProposeEvaluatorsRoute(deps);
}
