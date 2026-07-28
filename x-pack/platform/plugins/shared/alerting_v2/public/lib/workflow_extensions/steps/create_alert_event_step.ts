/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { StepCategory } from '@kbn/workflows';
import { createPublicStepDefinition } from '@kbn/workflows-extensions/public';
import { z } from '@kbn/zod/v4';

const inputSchema = z.object({
  source: z
    .string()
    .describe(
      'Source system identifier (e.g. "prometheus", "datadog"). Prefix "elastic." is reserved.'
    ),
  fingerprint: z.string().describe('Stable grouping key for this alert series (e.g. alertname, dedup_key)'),
  rule_id: z
    .string()
    .optional()
    .describe('Rule/monitor/check ID in the source system; defaults to source'),
  rule_name: z.string().optional().describe('Human-readable rule name; falls back to rule_id or source'),
  alert_url: z
    .string()
    .optional()
    .describe('URL to view this alert in its origin system'),
  alert_status: z
    .enum(['active', 'inactive', 'pending', 'recovering'])
    .optional()
    .describe('Explicit lifecycle override; defaults to active'),
  data: z
    .record(z.string(), z.unknown())
    .optional()
    .describe('Alert payload — arbitrary k/v metadata'),
  timestamp: z.string().optional().describe('ISO-8601 override for @timestamp'),
  severity: z
    .string()
    .optional()
    .describe('Severity level: info | low | medium | high | critical'),
});

const outputSchema = z.object({
  group_hash: z.string().describe('Stable series key for this alert; use in action URLs'),
});

const configSchema = z.object({});

export const createAlertEventStepDefinition = createPublicStepDefinition({
  id: 'alerting_v2.create_alert',
  category: StepCategory.Kibana,
  label: i18n.translate('alertingV2.workflowStep.createAlert.label', {
    defaultMessage: 'Create V2 Alert',
  }),
  description: i18n.translate('alertingV2.workflowStep.createAlert.description', {
    defaultMessage:
      'Push an alert event directly into the Elastic v2 alerting system without a backing rule.',
  }),
    documentation: {
      details: i18n.translate('alertingV2.workflowStep.createAlert.documentation.details', {
        defaultMessage: `The {stepId} step writes a pre-normalized alert event into the v2 alerting system via {apiPath}. Use it to bridge external monitoring tools (Prometheus, PagerDuty, CloudWatch) into Elastic's alerting episode lifecycle.

Use a stable {fingerprint} to group events into the same alert series. The server manages episode lifecycle automatically: same fingerprint while active continues the episode; after recovery, same fingerprint opens a new episode. Set {alertStatus} to signal recovery when the source system has no end timestamp.`,
        values: {
          stepId: '`alerting_v2.create_alert`',
          apiPath: '`POST /api/alerting/v2/alerts`',
          fingerprint: '`fingerprint`',
          alertStatus: '`alert_status`',
        },
      }),
      examples: [
        `## Fire an alert from Prometheus
\`\`\`yaml
- name: push-alert
  type: alerting_v2.create_alert
  with:
    source: "prometheus"
    fingerprint: "\${{ trigger.labels.alertname }}-\${{ trigger.labels.instance }}"
    rule_id: "\${{ trigger.labels.alertname }}"
    alert_url: "\${{ trigger.generatorURL }}"
    timestamp: "\${{ trigger.startsAt }}"
    data:
      summary: "\${{ trigger.annotations.summary }}"
\`\`\``,

        `## Resolve a previously fired alert
\`\`\`yaml
- name: resolve-alert
  type: alerting_v2.create_alert
  with:
    source: "prometheus"
    fingerprint: "\${{ trigger.labels.alertname }}-\${{ trigger.labels.instance }}"
    rule_id: "\${{ trigger.labels.alertname }}"
    alert_status: "inactive"
    timestamp: "\${{ trigger.endsAt }}"
\`\`\``,
      ],
    },
  icon: React.lazy(() =>
    import('@elastic/eui/es/components/icon/assets/bell').then(({ icon }) => ({
      default: icon,
    }))
  ),
  inputSchema,
  outputSchema,
  configSchema,
});
