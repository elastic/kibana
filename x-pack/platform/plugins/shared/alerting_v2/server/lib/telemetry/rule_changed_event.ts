/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleKind, RuleResponse } from '@kbn/alerting-v2-schemas';
import type { EventTypeOpts } from '@kbn/core/server';
import {
  RULE_CREATED_EVENT_TYPE,
  RULE_DELETED_EVENT_TYPE,
  RULE_DISABLED_EVENT_TYPE,
  RULE_ENABLED_EVENT_TYPE,
  RULE_UPDATED_EVENT_TYPE,
} from '../events/rule_event_publisher/events';
import type { RuleEventChannel } from '../rules_client/rule_event_origin';
import type { EventOrigin } from '../event_origin/token';

/** Domain event types reported as telemetry; the event type is the reported operation. */
export const RULE_OPERATIONS = [
  RULE_CREATED_EVENT_TYPE,
  RULE_UPDATED_EVENT_TYPE,
  RULE_DELETED_EVENT_TYPE,
  RULE_ENABLED_EVENT_TYPE,
  RULE_DISABLED_EVENT_TYPE,
] as const;

export type RuleOperation = (typeof RULE_OPERATIONS)[number];

export interface RuleChangedEventOrigin {
  actor: EventOrigin;
  channel: RuleEventChannel;
  app?: string;
}

export interface RuleChangedEventData {
  rule_id: string;
  operation: RuleOperation;
  template_id?: string;
  created_at: string;
  kind: RuleKind;
  builder_type?: string;
  enabled: boolean;
  origin: RuleChangedEventOrigin;
}

export const RULE_CHANGED_EBT_EVENT_TYPE = 'alerting_v2_rule_changed' as const;

export const RULE_CHANGED_EVENT: EventTypeOpts<RuleChangedEventData> = {
  eventType: RULE_CHANGED_EBT_EVENT_TYPE,
  schema: {
    rule_id: {
      type: 'keyword',
      _meta: {
        description: 'The id of the rule that was changed.',
        optional: false,
      },
    },
    operation: {
      type: 'keyword',
      _meta: {
        description:
          'The operation performed on the rule, as the domain event type: `rule.created`, `rule.updated`, `rule.deleted`, `rule.enabled` or `rule.disabled`.',
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
        description:
          'Whether the rule was enabled after the operation (for `rule.deleted`, whether it was enabled when deleted).',
        optional: false,
      },
    },
    origin: {
      properties: {
        actor: {
          type: 'keyword',
          _meta: {
            description:
              'Who made the change: `user` for a request carrying credentials, or `internal` for the Kibana internal user acting on its own.',
            optional: false,
          },
        },
        channel: {
          type: 'keyword',
          _meta: {
            description:
              'The channel the change was made through: `ui` for requests made by the Kibana browser app, `system` for Kibana acting on its own behalf, or `api` for any other request.',
            optional: false,
          },
        },
        app: {
          type: 'keyword',
          _meta: {
            description:
              'The app the change was made from: the app configured by the calling plugin or, for `ui` requests, the app named in the execution context. Absent otherwise.',
            optional: true,
          },
        },
      },
      _meta: {
        description: 'Where the change came from.',
        optional: false,
      },
    },
  },
};

export const ruleChangeTelemetryEvents: Array<EventTypeOpts<RuleChangedEventData>> = [
  RULE_CHANGED_EVENT,
];

/** Projects the telemetry payload from the domain rule; optional fields are omitted when absent. */
export const buildRuleChangedEventData = (
  rule: RuleResponse,
  {
    operation,
    origin: { actor, channel, app },
  }: { operation: RuleOperation; origin: RuleChangedEventOrigin }
): RuleChangedEventData => {
  const { id, kind, enabled, created_at: createdAt, metadata } = rule;
  const templateId = metadata.template?.id;
  const builderType = metadata.builder?.type;

  return {
    rule_id: id,
    operation,
    ...(templateId ? { template_id: templateId } : {}),
    created_at: createdAt,
    kind,
    ...(builderType ? { builder_type: builderType } : {}),
    enabled,
    origin: { actor, channel, ...(app ? { app } : {}) },
  };
};
