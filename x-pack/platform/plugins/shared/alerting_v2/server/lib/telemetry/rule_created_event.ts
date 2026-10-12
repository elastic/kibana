/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleKind, RuleResponse } from '@kbn/alerting-v2-schemas';
import type { EventTypeOpts } from '@kbn/core/server';
export interface RuleCreatedEventData {
  rule_id: string;
  template_id?: string;
  created_at: string;
  kind: RuleKind;
  builder_type?: string;
  enabled: boolean;
}

export const RULE_CREATED_EVENT: EventTypeOpts<RuleCreatedEventData> = {
  eventType: 'alerting_v2_rule_created',
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
        description: 'The id of the rule template the rule was installed from, when known.',
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
    kind: {
      type: 'keyword',
      _meta: {
        description:
          'Whether the rule creates alerts (`alert`) or only stores matching events (`signal`).',
        optional: false,
      },
    },
    builder_type: {
      type: 'keyword',
      _meta: {
        description:
          'The rule builder the rule was authored with, when it was created by a builder.',
        optional: true,
      },
    },
    enabled: {
      type: 'boolean',
      _meta: {
        description: 'Whether the rule was created in an enabled state.',
        optional: false,
      },
    },
  },
};

export const ruleCreateTelemetryEvents: Array<EventTypeOpts<RuleCreatedEventData>> = [
  RULE_CREATED_EVENT,
];

/** Projects the telemetry payload from the domain rule; optional fields are omitted when absent. */
export const buildRuleCreatedEventData = (rule: RuleResponse): RuleCreatedEventData => {
  const { id, kind, enabled, created_at: createdAt, metadata } = rule;
  const templateId = metadata.template?.id;
  const builderType = metadata.builder?.type;

  return {
    rule_id: id,
    ...(templateId ? { template_id: templateId } : {}),
    created_at: createdAt,
    kind,
    ...(builderType ? { builder_type: builderType } : {}),
    enabled,
  };
};
