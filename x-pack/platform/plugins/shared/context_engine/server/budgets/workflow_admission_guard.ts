/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowExecutionAdmissionGuard } from '@kbn/workflows-extensions/server';
import type { AiIndexService } from '../ai_indices/service';
import type { BudgetServiceApi } from './budget_service';

export const CONTEXT_ENGINE_BUDGET_GUARD_ID = 'contextEngine.budget';

/**
 * Pauses the automations of an AI index once its automation budget, or the space's, is spent.
 * Workflows that are not attached to an AI index are always admitted.
 */
export const createWorkflowBudgetAdmissionGuard = ({
  getAiIndexService,
  getBudgetService,
}: {
  getAiIndexService: () => Pick<AiIndexService, 'findByAutomation'>;
  getBudgetService: () => Pick<BudgetServiceApi, 'checkAdmission'>;
}): WorkflowExecutionAdmissionGuard => {
  return async ({ workflowId, spaceId }) => {
    const aiIndexId = await getAiIndexService().findByAutomation(workflowId, spaceId);
    if (!aiIndexId) {
      return { admitted: true };
    }
    return getBudgetService().checkAdmission({ bucket: 'automations', spaceId, aiIndexId });
  };
};
