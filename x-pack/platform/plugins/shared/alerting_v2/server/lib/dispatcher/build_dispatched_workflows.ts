/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DispatchedWorkflow } from '../events/dispatcher_event_publisher/events';
import { DispatchOutcome, DispatchPlan, PolicyCatalog } from './state';
import type { ActionGroup, ActionGroupId, DispatcherPipelineState } from './types';

/**
 * Resolves every successful (group, workflow) delivery recorded by
 * {@link DispatchStep} into the data the dispatcher completion event carries.
 */
export const buildDispatchedWorkflows = (
  state: Readonly<DispatcherPipelineState>
): DispatchedWorkflow[] => {
  const {
    plan = DispatchPlan.empty(),
    outcome = DispatchOutcome.empty(),
    policies = PolicyCatalog.empty(),
  } = state;

  const groupsById = new Map<ActionGroupId, ActionGroup>(
    plan.toDispatch.map((group) => [group.id, group])
  );

  return outcome.deliveries.flatMap(({ actionGroupId, workflowId, workflowExecutionId }) => {
    const group = groupsById.get(actionGroupId);
    if (!group) {
      return [];
    }

    return [
      {
        workflowId,
        actionPolicyId: group.policyId,
        workflowExecutionId,
        spaceId: group.spaceId,
        ruleIds: Object.keys(group.rules),
        alertCount: group.alerts.length,
        throttleStrategy: policies.throttleStrategyOf(group.policyId),
        groupingMode: policies.groupingModeOf(group.policyId),
      },
    ];
  });
};
