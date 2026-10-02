/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CreateActionPolicyDataInput } from '@kbn/alerting-v2-schemas';

export const ACTION_POLICY_TEMPLATE_KEYS = {
  allAlerts: 'all_alerts',
  criticalSeverity: 'critical_severity',
  dailyDigest: 'daily_digest',
} as const;

export type ActionPolicyTemplateKey =
  (typeof ACTION_POLICY_TEMPLATE_KEYS)[keyof typeof ACTION_POLICY_TEMPLATE_KEYS];

export type ActionPolicyTemplateData = Omit<CreateActionPolicyDataInput, 'destinations'>;

export interface ActionPolicyTemplate {
  readonly key: ActionPolicyTemplateKey;
  readonly data: ActionPolicyTemplateData;
}

export const ACTION_POLICY_TEMPLATES: readonly ActionPolicyTemplate[] = [
  {
    key: ACTION_POLICY_TEMPLATE_KEYS.allAlerts,
    data: {
      name: 'Template: all alerts',
      description:
        'Notifies once per alert episode status change for every alert. Replace the destination workflow to deliver to your own channel.',
      grouping_mode: 'per_episode',
      throttle: { strategy: 'on_status_change' },
    },
  },
  {
    key: ACTION_POLICY_TEMPLATE_KEYS.criticalSeverity,
    data: {
      name: 'Template: critical severity alerts',
      description:
        'Notifies about critical alerts on status changes and repeats every hour while the episode stays in the same status.',
      matcher: { expression: 'severity: "critical"' },
      grouping_mode: 'per_episode',
      throttle: { strategy: 'per_status_interval', interval: '1h' },
    },
  },
  {
    key: ACTION_POLICY_TEMPLATE_KEYS.dailyDigest,
    data: {
      name: 'Template: daily digest',
      description: 'Sends a single notification per day that includes all matching alert episodes.',
      grouping_mode: 'all',
      throttle: { strategy: 'time_interval', interval: '24h' },
    },
  },
];
