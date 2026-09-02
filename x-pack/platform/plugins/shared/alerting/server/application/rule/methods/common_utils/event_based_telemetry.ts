/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceStart, EventTypeOpts, Logger } from '@kbn/core/server';

interface ReportEventContext {
  analytics?: Pick<AnalyticsServiceStart, 'reportEvent'>;
  logger: Logger;
}

export interface RuleCreatedEventData {
  rule_id: string;
  template_id?: string;
  created_at: string;
  rule_type_id: string;
  enabled: boolean;
  consumer: string;
  producer: string;
}

export const RULE_CREATED_EVENT: EventTypeOpts<RuleCreatedEventData> = {
  eventType: 'alerting_rule_created',
  schema: {
    rule_id: {
      type: 'keyword',
      _meta: {
        description: 'The id of the newly created rule.',
        optional: false,
      },
    },
    template_id: {
      type: 'keyword',
      _meta: {
        description:
          'The id of the rule template the rule was created from, when known (for example, from the rule gallery or a Fleet-installed package).',
        optional: true,
      },
    },
    created_at: {
      type: 'date',
      _meta: {
        description: 'ISO timestamp of when the rule was created.',
        optional: false,
      },
    },
    rule_type_id: {
      type: 'keyword',
      _meta: {
        description: 'The rule type identifier (e.g. `.es-query`).',
        optional: false,
      },
    },
    enabled: {
      type: 'boolean',
      _meta: {
        description: 'Whether the rule was created in an enabled state.',
        optional: false,
      },
    },
    consumer: {
      type: 'keyword',
      _meta: {
        description: 'The consumer (feature/application) that owns the rule.',
        optional: false,
      },
    },
    producer: {
      type: 'keyword',
      _meta: {
        description: 'The rule type producer, as registered by the owning plugin.',
        optional: false,
      },
    },
  },
};

export const ruleCreateTelemetryEvents: Array<EventTypeOpts<Record<string, unknown>>> = [
  RULE_CREATED_EVENT,
];

export function reportRuleCreatedEvent(
  context: ReportEventContext,
  {
    id,
    templateId,
    createTime,
    alertTypeId,
    enabled,
    consumer,
    producer,
  }: {
    id: string;
    templateId?: string;
    createTime: number;
    alertTypeId: string;
    enabled: boolean;
    consumer: string;
    producer: string;
  }
): void {
  try {
    context.analytics?.reportEvent(RULE_CREATED_EVENT.eventType, {
      rule_id: id,
      ...(templateId ? { template_id: templateId } : {}),
      created_at: new Date(createTime).toISOString(),
      rule_type_id: alertTypeId,
      enabled,
      consumer,
      producer,
    });
  } catch (e) {
    context.logger.debug(`Failed to report rule create telemetry event: ${e}`);
  }
}
