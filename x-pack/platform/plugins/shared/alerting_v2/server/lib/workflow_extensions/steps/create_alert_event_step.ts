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
  source_id: z.string().describe('Stable identifier for the external system or rule source'),
  episode_id: z.string().describe('Unique identifier for this alert episode/firing instance'),
  data: z.record(z.string(), z.unknown()).describe('Alert payload — arbitrary k/v metadata'),
  fingerprint: z
    .string()
    .optional()
    .describe('Caller-provided series key; stable across firings of the same condition'),
  timestamp: z.string().optional().describe('ISO-8601 override for @timestamp'),
  started_at: z.string().optional().describe('ISO-8601 when the condition began'),
  ended_at: z
    .string()
    .optional()
    .describe('ISO-8601 when the condition cleared; presence implies recovery'),
  episode_status: z
    .enum(['pending', 'recovering'])
    .optional()
    .describe('Explicit lifecycle override (pending or recovering only)'),
  severity: z
    .enum(['info', 'low', 'medium', 'high', 'critical'])
    .optional()
    .describe('Severity level: info | low | medium | high | critical'),
});

const outputSchema = z.object({
  group_hash: z.string().describe('Stable series key for this alert; use in action URLs'),
});

const configSchema = z.object({});

/**
 * Factory that captures `getStartServices` so the handler can resolve the Kibana
 * server URL at execution time (avoids hard-coding host/port).
 */
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
        defaultMessage: `The {stepId} step writes a pre-normalized alert event into the v2 alerting system via the {apiPath} endpoint. Use it to bridge external monitoring tools (Prometheus, PagerDuty, CloudWatch) into Elastic's alerting episode lifecycle. The alert appears in the Episodes UI and supports ack/snooze.

Pass the same {fingerprint} on every firing of the same condition to keep events in one episode. Presence of {endedAt} signals recovery and closes the episode.`,
        values: {
          stepId: '`alerting_v2.create_alert`',
          apiPath: '`POST /api/alerting/v2/alerts`',
          fingerprint: '`fingerprint`',
          endedAt: '`ended_at`',
        },
      }),
      examples: [
        `## Fire an alert from an external system
\`\`\`yaml
- name: push-alert
  type: alerting_v2.create_alert
  with:
    source_id: "prometheus-prod"
    episode_id: "\${{ trigger.alert_id }}"
    fingerprint: "\${{ trigger.labels.alertname }}-\${{ trigger.labels.instance }}"
    started_at: "\${{ trigger.startsAt }}"
    data:
      summary: "\${{ trigger.annotations.summary }}"
      severity: "\${{ trigger.labels.severity }}"
\`\`\``,

        `## Resolve a previously fired alert
\`\`\`yaml
- name: resolve-alert
  type: alerting_v2.create_alert
  with:
    source_id: "prometheus-prod"
    episode_id: "\${{ trigger.alert_id }}"
    fingerprint: "\${{ trigger.labels.alertname }}-\${{ trigger.labels.instance }}"
    started_at: "\${{ trigger.startsAt }}"
    ended_at: "\${{ trigger.endsAt }}"
    data:
      summary: "\${{ trigger.annotations.summary }}"
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

      // Forward auth headers from the workflow's user context
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

      const {
        source_id,
        episode_id,
        data,
        fingerprint,
        timestamp,
        started_at,
        ended_at,
        episode_status,
        severity,
      } = context.input;

      const body: Record<string, unknown> = {
        source_id,
        episode_id,
        data,
      };
      if (fingerprint != null) body.fingerprint = fingerprint;
      if (timestamp != null) body.timestamp = timestamp;
      if (started_at != null) body.started_at = started_at;
      if (ended_at != null) body.ended_at = ended_at;
      if (episode_status != null) body.episode_status = episode_status;
      if (severity != null) body.severity = severity;

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
          `Network error posting to ${url} for source_id=${source_id}`,
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
        `Created external alert via API: source_id=${source_id} episode_id=${episode_id} group_hash=${groupHash}`
      );

      return { output: { group_hash: groupHash } };
    },
  });
}
