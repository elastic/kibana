/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuleCatalog } from '../dispatcher/state';
import { buildActionGroups } from '../dispatcher/steps/build_groups_step';
import type { ActionPolicyWorkflowPayload } from '../dispatcher/types';
import { toWorkflowPayload } from '../dispatcher/workflow_payload';
import {
  TEST_ID_PREFIX,
  createSyntheticScenario,
  type SyntheticScenarioParams,
} from './synthetic_alert_factory';

/**
 * Builds the workflow payloads a policy would dispatch for a synthetic scenario, one per action
 * group. Grouping goes through the dispatcher's own `buildActionGroups`, so group keys and payloads
 * match production. Group ids are prefixed with `TEST_ID_PREFIX` so a test run can never share an
 * id with a real group of the same policy. The policy KQL matcher is not applied: synthetic alerts
 * are not generated to satisfy it.
 */
export const buildTestScenario = (
  params: SyntheticScenarioParams
): ActionPolicyWorkflowPayload[] => {
  const { alerts, rules } = createSyntheticScenario(params);
  const ruleCatalog = RuleCatalog.of(new Map(rules.map((rule) => [rule.id, rule])));
  const groups = buildActionGroups(
    alerts.map((alert) => ({ alert, policy: params.policy })),
    ruleCatalog
  );

  return groups.map((group) => ({
    ...toWorkflowPayload(group),
    id: `${TEST_ID_PREFIX}${group.id}`,
  }));
};
