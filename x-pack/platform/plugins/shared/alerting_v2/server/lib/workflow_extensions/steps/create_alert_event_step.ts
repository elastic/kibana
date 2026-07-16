/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/server';
import { StepCategory } from '@kbn/workflows';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { z } from '@kbn/zod/v4';
import { i18n } from '@kbn/i18n';
import { ALERTING_V2_ALERT_API_PATH } from '@kbn/alerting-v2-constants';

const inputSchema = z.object({
  source: z
    .string()
    .describe('Source system identifier (e.g. "prometheus", "datadog"). Prefix "elastic." is reserved.'),
  fingerprint: z.string().describe('Stable grouping key for this alert series (e.g. alertname, dedup_key)'),
  rule_id: z
    .string()
    .optional()
    .describe('Rule/monitor/check ID in the source system; defaults to source'),
  rule_name: z.string().optional().describe('Human-readable rule name; falls back to rule_id or source'),
  alert_url: z.string().optional().describe('Link to this alert in its origin system'),
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

export function createAlertEventStepDefinition(
  getStartServices: () => Promise<[CoreStart, unknown, unknown]>
) {
  return createServerStepDefinition({
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
    inputSchema,
    outputSchema,
    configSchema,
    handler: async (context) => {
      const [coreStart] = await getStartServices();

      const { protocol, hostname, port } = coreStart.http.getServerInfo();
      const basePath = coreStart.http.basePath.serverBasePath;
      const url = `${protocol}://${hostname}:${port}${basePath}${ALERTING_V2_ALERT_API_PATH}`;

      const fakeRequest = context.contextManager.getFakeRequest();
      const forwardHeaders: Record<string, string> = {
        'content-type': 'application/json',
        'kbn-xsrf': 'true',
        'x-elastic-internal-origin': 'kibana',
      };
      for (const [key, value] of Object.entries(fakeRequest.headers)) {
        const lowerKey = key.toLowerCase();
        if (
          value != null &&
          !['host', 'content-length', 'transfer-encoding', 'content-type'].includes(lowerKey)
        ) {
          forwardHeaders[lowerKey] = Array.isArray(value) ? value[0] : String(value);
        }
      }

      const input = context.input;

      const body: Record<string, unknown> = {
        source: input.source,
        fingerprint: input.fingerprint,
      };
      if (input.rule_id != null) body.rule_id = input.rule_id;
      if (input.rule_name != null) body.rule_name = input.rule_name;
      if (input.alert_url != null) body.alert_url = input.alert_url;
      if (input.alert_status != null) body.alert_status = input.alert_status;
      if (input.data != null) body.data = input.data;
      if (input.timestamp != null) body.timestamp = input.timestamp;
      if (input.severity != null) body.severity = input.severity;

      let response: Response;
      try {
        response = await fetch(url, {
          method: 'POST',
          headers: forwardHeaders,
          body: JSON.stringify(body),
          signal: context.abortSignal,
        });
      } catch (err) {
        context.logger.error(
          `Network error posting to ${url} for source=${input.source} fingerprint=${input.fingerprint}`,
          err instanceof Error ? err : undefined
        );
        return { error: err instanceof Error ? err : new Error(String(err)) };
      }

      if (!response.ok) {
        const text = await response.text().catch(() => '(unreadable)');
        const msg = `POST ${url} returned ${response.status}: ${text}`;
        context.logger.error(msg);
        return { error: new Error(msg) };
      }

      const responseBody = (await response.json()) as { id: string };
      const groupHash = responseBody.id;

      context.logger.info(
        `Created external alert via API: source=${input.source} fingerprint=${input.fingerprint} group_hash=${groupHash}`
      );

      return { output: { group_hash: groupHash } };
    },
  });
}
