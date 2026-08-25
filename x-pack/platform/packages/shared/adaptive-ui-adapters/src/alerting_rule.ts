/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { badge, codeBlock, descriptionList, text, view } from '@kbn/adaptive-ui/builders';
import type { BodyNode, ViewSpec } from '@kbn/adaptive-ui';

/**
 * Mirror of `RuleAttachmentData` from `@kbn/response-ops-alerting-v2-schemas`
 * (`rule_attachment_schema.ts`); only the presentational subset is mirrored.
 */
export interface AlertingRuleData {
  metadata: {
    name: string;
    description?: string;
    tags?: string[];
    builder_type?: string;
  };
  kind?: string;
  time_field?: string;
  schedule?: { interval?: string };
  query?: string;
  enabled?: boolean;
}

/**
 * Alternate rendering for the `platform.alerting.rule` attachment ([rule_attachment_definition.tsx](../../../../plugins/shared/alerting_v2/public/agent_builder/attachments/rule_attachment_definition.tsx)):
 * status/kind badges, a schedule/field description list, the highlighted query,
 * the description, and a tag badge row.
 */
export const toAlertingRuleViewSpec = ({
  metadata,
  kind,
  time_field: timeField,
  schedule,
  query,
  enabled,
}: AlertingRuleData): ViewSpec => {
  const body: BodyNode[] = [
    badge({
      items: [
        {
          label: enabled === false ? 'Disabled' : 'Enabled',
          tone: enabled === false ? 'neutral' : 'success',
          variant: 'fill',
        },
        ...(kind ? [{ label: kind, tone: 'primary' as const, variant: 'hollow' as const }] : []),
      ],
    }),
  ];

  const details: Array<{ title: string; description: string }> = [];
  if (schedule?.interval) {
    details.push({ title: 'Schedule', description: `Every ${schedule.interval}` });
  }
  if (timeField) {
    details.push({ title: 'Time field', description: timeField });
  }
  if (metadata.builder_type) {
    details.push({ title: 'Type', description: metadata.builder_type });
  }
  if (details.length > 0) {
    body.push(descriptionList({ label: 'Rule', layout: 'inline', items: details }));
  }

  if (query) {
    body.push(codeBlock({ language: 'esql', code: query, title: 'Query' }));
  }
  if (metadata.description) {
    body.push(text({ body: metadata.description }));
  }
  if (metadata.tags && metadata.tags.length > 0) {
    body.push(badge({ label: 'Tags', items: metadata.tags.map((label) => ({ label })) }));
  }

  return view({ title: metadata.name, subtitle: 'Alerting rule', body });
};

export const sampleAlertingRule: AlertingRuleData = {
  metadata: {
    name: 'High error rate on checkout',
    description:
      'Alerts when the 5xx rate on the checkout service exceeds 5% over a 5-minute window.',
    tags: ['checkout', 'availability'],
    builder_type: 'threshold',
  },
  kind: 'metric threshold',
  time_field: '@timestamp',
  schedule: { interval: '1m' },
  enabled: true,
  query: 'FROM metrics-checkout-* | STATS error_rate = AVG(http.5xx_ratio) BY service.name',
};
