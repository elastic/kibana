/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { badge, codeBlock, descriptionList, text, view } from '@kbn/adaptive-ui/builders';
import type { BodyNode, ViewSpec } from '@kbn/adaptive-ui';
import { getBreachEsqlQuery, type Query } from '@kbn/alerting-v2-schemas';

/**
 * Presentational subset of `RuleAttachmentData` from `@kbn/alerting-v2-schemas`.
 * `schedule.every` and structured `query` match the live attachment payload.
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
  schedule?: { every?: string; lookback?: string };
  query?: Query;
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
  if (schedule?.every) {
    details.push({ title: 'Schedule', description: `Every ${schedule.every}` });
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
    body.push(codeBlock({ language: 'esql', code: getBreachEsqlQuery(query), title: 'Query' }));
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
  kind: 'alert',
  time_field: '@timestamp',
  schedule: { every: '1m' },
  enabled: true,
  query: {
    format: 'standalone',
    breach: {
      query: 'FROM metrics-checkout-* | STATS error_rate = AVG(http.5xx_ratio) BY service.name',
    },
  },
};
