/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  NotificationGroup,
  NotificationPolicy,
  NotificationPolicyId,
  Rule,
  RuleId,
} from './types';

export async function getFakeRulesByIds(ruleIds: RuleId[]): Promise<Map<RuleId, Rule>> {
  const now = new Date().toISOString();
  const rules = ruleIds.reduce((acc, ruleId) => {
    acc[ruleId] = {
      id: ruleId,
      name: `Rule ${ruleId}`,
      description: `Description for rule ${ruleId}`,
      notificationPolicyIds: ['policy_123', 'policy_456'],
      enabled: true,
      createdAt: now,
      updatedAt: now,
    };
    return acc;
  }, {} as Record<RuleId, Rule>);

  return new Map(Object.entries(rules));
}

const FAKE_POLICIES: Record<NotificationPolicyId, NotificationPolicy> = {
  policy_123: {
    id: 'policy_123',
    name: 'Policy matching critical alerts in non-dev environments',
    matcher: undefined, // catch-all, matcher is not supported yet
    groupBy: [], // not implemted yet, require flattened data support
    throttle: {
      interval: '1h',
    },
    workflowId: 'workflow_123',
  },
  policy_456: {
    id: 'policy_456',
    name: 'Policy matching all alerts but throttled to 5 minutes',
    matcher: 'false', // matcher is not supported yet
    groupBy: [], // not implemted yet, require flattened data support
    throttle: {
      interval: '5m',
    },
    workflowId: 'workflow_456',
  },
};

export async function getFakeNotificationPoliciesByIds(
  notificationPolicyIds: NotificationPolicyId[]
): Promise<Map<NotificationPolicyId, NotificationPolicy>> {
  const policies = notificationPolicyIds.reduce((acc, policyId) => {
    acc[policyId] = FAKE_POLICIES[policyId];
    return acc;
  }, {} as Record<NotificationPolicyId, NotificationPolicy>);
  return new Map(Object.entries(policies));
}

export async function executeFakeWorkflow(group: NotificationGroup): Promise<void> {
  console.log(
    `Executing workflow ${group.workflowId} for group ${group.id} : ${JSON.stringify(
      group,
      null,
      2
    )}`
  );
}
