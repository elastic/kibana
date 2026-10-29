/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionPolicyTestUnsupportedReason } from '@kbn/alerting-v2-schemas';
import { PolicyMatcher, RuleCatalog } from '../dispatcher/state';
import { buildActionGroups } from '../dispatcher/steps/build_groups_step';
import type { ActionGroupId, ActionPolicyWorkflowPayload } from '../dispatcher/types';
import { toWorkflowPayload } from '../dispatcher/workflow_payload';
import { createSyntheticScenario, type SyntheticScenarioParams } from './synthetic_alert_factory';

export interface TestScenarioGroup {
  id: ActionGroupId;
  groupKey: Record<string, unknown>;
  payload: ActionPolicyWorkflowPayload;
}

export type TestScenario =
  | { status: 'ok'; groups: TestScenarioGroup[] }
  | { status: 'unsupported'; reason: ActionPolicyTestUnsupportedReason };

/**
 * Builds the action groups a policy would dispatch for a synthetic scenario. Grouping goes through
 * the dispatcher's own `buildActionGroups`, so group ids, group keys and payloads match production.
 * A policy whose matcher has a KQL expression is not supported yet.
 */
export const buildTestScenario = (params: SyntheticScenarioParams): TestScenario => {
  const { policy } = params;
  if (PolicyMatcher.of(policy.matcher).expressionKql() !== null) {
    return { status: 'unsupported', reason: 'matcher_expression' };
  }

  const { alerts, rules } = createSyntheticScenario(params);
  const ruleCatalog = RuleCatalog.of(new Map(rules.map((rule) => [rule.id, rule])));
  const groups = buildActionGroups(
    alerts.map((alert) => ({ alert, policy })),
    ruleCatalog
  );

  return {
    status: 'ok',
    groups: groups.map((group) => ({
      id: group.id,
      groupKey: group.groupKey,
      payload: toWorkflowPayload(group),
    })),
  };
};
