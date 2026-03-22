/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import type { EvalsRequestHandlerContext } from '../../types';
import { registerRunExplorationRoute } from './run_exploration';
import { registerListProposedSkillsRoute } from './list_proposed_skills';
import { registerApproveSkillRoute } from './approve_skill';
import { registerRejectSkillRoute } from './reject_skill';
import { registerRunSkillValidationRoute } from './run_skill_validation';
import { registerGetExplorationProgressRoute } from './get_exploration_progress';
import { registerGetExecutionDetailRoute } from './get_execution_detail';

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
 *
 * Production features:
 * - Comprehensive error handling (custom error classes)
 * - Input sanitization (prevent injection attacks)
 * - Audit logging (all operations logged)
 * - Performance monitoring (duration tracking)
 * - Real-time progress tracking (2-second polling)
 */
export function registerAESOPRoutes(router: IRouter<EvalsRequestHandlerContext>) {
  registerRunExplorationRoute(router);
  registerGetExplorationProgressRoute(router);
  registerGetExecutionDetailRoute(router);
  registerListProposedSkillsRoute(router);
  registerRunSkillValidationRoute(router);
  registerApproveSkillRoute(router);
  registerRejectSkillRoute(router);  // ✅ PRODUCTION: Reject workflow implemented
}
