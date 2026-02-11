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

const NOTIFICATION_POLICY_IDS: NotificationPolicyId[] = ['policy_123', 'policy_456', 'policy_789'];

export async function getFakeRulesByIds(ruleIds: RuleId[]): Promise<Map<RuleId, Rule>> {
  const now = new Date().toISOString();
  const rules = ruleIds.reduce((acc, ruleId) => {
    acc[ruleId] = {
      id: ruleId,
      name: `Rule ${ruleId}`,
      description: `Description for rule ${ruleId}`,
      notificationPolicyIds: NOTIFICATION_POLICY_IDS.slice(
        0,
        Math.floor(Math.random() * NOTIFICATION_POLICY_IDS.length) + 1
      ),
      enabled: true,
      createdAt: now,
      updatedAt: now,
    };
    return acc;
  }, {} as Record<RuleId, Rule>);

  return new Map(Object.entries(rules));
}

export async function getFakeNotificationPoliciesByIds(
  notificationPolicyIds: NotificationPolicyId[]
): Promise<Map<NotificationPolicyId, NotificationPolicy>> {
  const policies = notificationPolicyIds.reduce((acc, policyId) => {
    acc[policyId] = {
      id: policyId,
      name: `Policy ${policyId}`,
      matcher: '',
      groupBy: ['data.env'],
      throttle: {
        interval: '1h',
      },
      workflowId: 'workflow_123',
    };
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
