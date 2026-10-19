/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionPolicyResponse } from '@kbn/alerting-v2-schemas';
import type { EventTypeOpts } from '@kbn/core/server';
import type { RuleChangedEventOrigin } from '../event_origin/origin_schemas';
import {
  ACTION_POLICY_CREATED_EBT_EVENT_TYPE,
  ACTION_POLICY_DELETED_EBT_EVENT_TYPE,
  ACTION_POLICY_DISABLED_EBT_EVENT_TYPE,
  ACTION_POLICY_ENABLED_EBT_EVENT_TYPE,
  ACTION_POLICY_UPDATED_EBT_EVENT_TYPE,
  type ActionPolicyChangedEbtData,
  type ActionPolicyEbtEventType,
  type ActionPolicyEbtMatcherType,
} from './action_policy_ebt_schema';
import { eventOriginEbtSchema, toEventOrigin } from './event_origin';

/** Operations on an action policy that are reported as telemetry. */
export const ACTION_POLICY_OPERATIONS = [
  'created',
  'updated',
  'deleted',
  'enabled',
  'disabled',
] as const;

export type ActionPolicyOperation = (typeof ACTION_POLICY_OPERATIONS)[number];

/** Maps each operation to the EBT event type registered for it. */
export const ACTION_POLICY_EBT_EVENT_TYPE_BY_OPERATION = {
  created: ACTION_POLICY_CREATED_EBT_EVENT_TYPE,
  updated: ACTION_POLICY_UPDATED_EBT_EVENT_TYPE,
  deleted: ACTION_POLICY_DELETED_EBT_EVENT_TYPE,
  enabled: ACTION_POLICY_ENABLED_EBT_EVENT_TYPE,
  disabled: ACTION_POLICY_DISABLED_EBT_EVENT_TYPE,
} as const satisfies Record<ActionPolicyOperation, ActionPolicyEbtEventType>;

const actionPolicyChangedEventSchema: EventTypeOpts<ActionPolicyChangedEbtData>['schema'] = {
  action_policy_id: {
    type: 'keyword',
    _meta: {
      description: 'The id of the action policy that was changed.',
      optional: false,
    },
  },
  created_at: {
    type: 'date',
    _meta: {
      description: 'ISO timestamp of when the action policy was created.',
      optional: false,
    },
  },
  enabled: {
    type: 'boolean',
    _meta: {
      description:
        'Whether the action policy was enabled after the operation (for a delete, whether it was enabled when deleted).',
      optional: false,
    },
  },
  destination_count: {
    type: 'integer',
    _meta: {
      description: 'The number of destinations the action policy notifies.',
      optional: false,
    },
  },
  matcher_type: {
    type: 'keyword',
    _meta: {
      description:
        'How the action policy selects alerts: `none` for a catch-all policy, `tags`, `expression`, or `tags_and_expression`.',
      optional: false,
    },
  },
  grouping_mode: {
    type: 'keyword',
    _meta: {
      description:
        'How matched alerts are batched into notifications: `per_alert`, `all` or `per_field`. `per_alert` when no grouping is set.',
      optional: false,
    },
  },
  throttle_strategy: {
    type: 'keyword',
    _meta: {
      description: 'The throttle strategy, when the action policy has a throttle.',
      optional: true,
    },
  },
  snoozed: {
    type: 'boolean',
    _meta: {
      description: 'Whether the action policy has a snooze set.',
      optional: false,
    },
  },
  origin: eventOriginEbtSchema,
};

/** One registered event per operation. Every event uses {@link ActionPolicyChangedEbtData}. */
export const actionPolicyChangeTelemetryEvents: Array<EventTypeOpts<ActionPolicyChangedEbtData>> =
  ACTION_POLICY_OPERATIONS.map((operation) => ({
    eventType: ACTION_POLICY_EBT_EVENT_TYPE_BY_OPERATION[operation],
    schema: actionPolicyChangedEventSchema,
  }));

const getMatcherType = ({ matcher }: ActionPolicyResponse): ActionPolicyEbtMatcherType => {
  const hasTags = Boolean(matcher?.tags?.length);
  const hasExpression = Boolean(matcher?.expression);

  if (hasTags && hasExpression) {
    return 'tags_and_expression';
  }
  if (hasTags) {
    return 'tags';
  }
  if (hasExpression) {
    return 'expression';
  }
  return 'none';
};

const buildActionPolicyFields = (
  policy: ActionPolicyResponse
): Omit<ActionPolicyChangedEbtData, 'origin'> => {
  const { id, created_at: createdAt, enabled, destinations, grouping, throttle } = policy;

  return {
    action_policy_id: id,
    created_at: createdAt,
    enabled,
    destination_count: destinations.length,
    matcher_type: getMatcherType(policy),
    grouping_mode: grouping?.mode ?? 'per_alert',
    ...(throttle ? { throttle_strategy: throttle.strategy } : {}),
    snoozed: Boolean(policy.snoozed_until),
  };
};

/**
 * Projects an action policy change telemetry payload. Names, descriptions, matcher contents,
 * grouping fields, destinations and actors are not reported.
 */
export const buildActionPolicyChangedEventData = (
  policy: ActionPolicyResponse,
  origin: RuleChangedEventOrigin
): ActionPolicyChangedEbtData => ({
  ...buildActionPolicyFields(policy),
  origin: toEventOrigin(origin),
});
