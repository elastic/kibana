/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { RuleLifecycleEvent } from '../../../common/workflows/triggers';
import type { WorkflowServiceContract } from '../services/workflow_service/workflow_service';

export const emitRuleWorkflowEvent = async (
  workflows: WorkflowServiceContract,
  request: KibanaRequest,
  triggerId: string,
  payload: RuleLifecycleEvent
): Promise<void> => {
  if (payload.rules.length === 0) {
    return;
  }

  try {
    await workflows.emitEvent(request, triggerId, payload);
  } catch {
    // Workflow emission must not fail rule CRUD; errors are logged by the workflows client.
  }
};

export const emitRuleWorkflowEvents = async (
  workflows: WorkflowServiceContract,
  request: KibanaRequest,
  events: Array<{ triggerId: string; payload: RuleLifecycleEvent }>
): Promise<void> => {
  for (const event of events) {
    await emitRuleWorkflowEvent(workflows, request, event.triggerId, event.payload);
  }
};

export const toRuleLifecyclePayload = (rules: RuleLifecycleEvent['rules']): RuleLifecycleEvent => ({
  rules,
});
