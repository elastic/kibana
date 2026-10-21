/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleResponse } from '@kbn/alerting-v2-schemas';
import type { EventTypeOpts } from '@kbn/core/server';
import type { RuleChangedEventOrigin } from '../event_origin/origin_schemas';
import {
  RULE_CREATED_EBT_EVENT_TYPE,
  RULE_DELETED_EBT_EVENT_TYPE,
  RULE_DISABLED_EBT_EVENT_TYPE,
  RULE_ENABLED_EBT_EVENT_TYPE,
  RULE_UPDATED_EBT_EVENT_TYPE,
  type RuleChangedEbtData,
  type RuleEbtEventType,
} from './rule_ebt_schema';
import {
  RULE_CREATED_EVENT_TYPE,
  RULE_DELETED_EVENT_TYPE,
  RULE_DISABLED_EVENT_TYPE,
  RULE_ENABLED_EVENT_TYPE,
  RULE_UPDATED_EVENT_TYPE,
} from '../events/rule_event_publisher/events';

/** Domain operations reported as telemetry. Each one is its own EBT event type. */
export const RULE_OPERATIONS = [
  RULE_CREATED_EVENT_TYPE,
  RULE_UPDATED_EVENT_TYPE,
  RULE_DELETED_EVENT_TYPE,
  RULE_ENABLED_EVENT_TYPE,
  RULE_DISABLED_EVENT_TYPE,
] as const;

export type RuleOperation = (typeof RULE_OPERATIONS)[number];

/** Maps each domain operation to the EBT event type registered for it. */
export const RULE_EBT_EVENT_TYPE_BY_OPERATION = {
  [RULE_CREATED_EVENT_TYPE]: RULE_CREATED_EBT_EVENT_TYPE,
  [RULE_UPDATED_EVENT_TYPE]: RULE_UPDATED_EBT_EVENT_TYPE,
  [RULE_DELETED_EVENT_TYPE]: RULE_DELETED_EBT_EVENT_TYPE,
  [RULE_ENABLED_EVENT_TYPE]: RULE_ENABLED_EBT_EVENT_TYPE,
  [RULE_DISABLED_EVENT_TYPE]: RULE_DISABLED_EBT_EVENT_TYPE,
} as const satisfies Record<RuleOperation, RuleEbtEventType>;

const ruleChangedEventSchema: EventTypeOpts<RuleChangedEbtData>['schema'] = {
  rule_id: {
    type: 'keyword',
    _meta: {
      description: 'The id of the rule that was changed.',
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
      description:
        'ISO timestamp of when the rule was created. Absent when the domain rule could not be read.',
      optional: true,
    },
  },
  kind: {
    type: 'keyword',
    _meta: {
      description:
        'Whether the rule creates alerts (`alert`) or only stores matching events (`signal`). Absent when the domain rule could not be read.',
      optional: true,
    },
  },
  builder_type: {
    type: 'keyword',
    _meta: {
      description: 'The rule builder the rule was authored with, when it was created by a builder.',
      optional: true,
    },
  },
  enabled: {
    type: 'boolean',
    _meta: {
      description:
        'Whether the rule was enabled after the operation (for `rule.deleted`, whether it was enabled when deleted). Absent when the domain rule could not be read.',
      optional: true,
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
};

/** One registered event per operation. Every event uses {@link RuleChangedEbtData}. */
export const ruleChangeTelemetryEvents: Array<EventTypeOpts<RuleChangedEbtData>> =
  RULE_OPERATIONS.map((operation) => ({
    eventType: RULE_EBT_EVENT_TYPE_BY_OPERATION[operation],
    schema: ruleChangedEventSchema,
  }));

const toEventOrigin = ({
  actor,
  channel,
  app,
}: RuleChangedEventOrigin): RuleChangedEventOrigin => ({
  actor,
  channel,
  ...(app ? { app } : {}),
});

/** Projects a rule-change telemetry payload. Rule fields are omitted when `rule` is absent. */
export const buildRuleChangedEventData = (
  rule: RuleResponse | undefined,
  origin: RuleChangedEventOrigin,
  ruleId: string
): RuleChangedEbtData => {
  const eventOrigin = toEventOrigin(origin);

  if (!rule) {
    return { rule_id: ruleId, origin: eventOrigin };
  }

  const { kind, enabled, created_at: createdAt, metadata } = rule;
  const templateId = metadata.template?.id;
  const builderType = metadata.builder?.type;

  return {
    rule_id: ruleId,
    ...(templateId ? { template_id: templateId } : {}),
    created_at: createdAt,
    kind,
    ...(builderType ? { builder_type: builderType } : {}),
    enabled,
    origin: eventOrigin,
  };
};
