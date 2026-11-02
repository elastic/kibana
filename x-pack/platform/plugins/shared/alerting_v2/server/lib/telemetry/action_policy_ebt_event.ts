/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionPolicyResponse } from '@kbn/alerting-v2-schemas';
import type { EventTypeOpts } from '@kbn/core/server';
import { PolicyMatcher } from '../dispatcher/state';
import type { EventOrigin } from '../event_origin/origin_schemas';
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
import { eventOriginEbtSchema } from './event_origin';
import {
  ACTION_POLICY_CREATED_EVENT_TYPE,
  ACTION_POLICY_DELETED_EVENT_TYPE,
  ACTION_POLICY_DISABLED_EVENT_TYPE,
  ACTION_POLICY_ENABLED_EVENT_TYPE,
  ACTION_POLICY_UPDATED_EVENT_TYPE,
} from '../events/action_policy_event_publisher/events';

/** Domain operations reported as telemetry. Each one is its own EBT event type. */
export const ACTION_POLICY_OPERATIONS = [
  ACTION_POLICY_CREATED_EVENT_TYPE,
  ACTION_POLICY_UPDATED_EVENT_TYPE,
  ACTION_POLICY_DELETED_EVENT_TYPE,
  ACTION_POLICY_ENABLED_EVENT_TYPE,
  ACTION_POLICY_DISABLED_EVENT_TYPE,
] as const;

export type ActionPolicyOperation = (typeof ACTION_POLICY_OPERATIONS)[number];

/** Maps each domain operation to the EBT event type registered for it. */
export const ACTION_POLICY_EBT_EVENT_TYPE_BY_OPERATION = {
  [ACTION_POLICY_CREATED_EVENT_TYPE]: ACTION_POLICY_CREATED_EBT_EVENT_TYPE,
  [ACTION_POLICY_UPDATED_EVENT_TYPE]: ACTION_POLICY_UPDATED_EBT_EVENT_TYPE,
  [ACTION_POLICY_DELETED_EVENT_TYPE]: ACTION_POLICY_DELETED_EBT_EVENT_TYPE,
  [ACTION_POLICY_ENABLED_EVENT_TYPE]: ACTION_POLICY_ENABLED_EBT_EVENT_TYPE,
  [ACTION_POLICY_DISABLED_EVENT_TYPE]: ACTION_POLICY_DISABLED_EBT_EVENT_TYPE,
} as const satisfies Record<ActionPolicyOperation, ActionPolicyEbtEventType>;

const actionPolicyChangedEventSchema: EventTypeOpts<ActionPolicyChangedEbtData>['schema'] = {
  action_policy_id: {
    type: 'keyword',
    _meta: {
      description: 'The id of the action policy that was changed.',
      optional: false,
    },
  },
  space_id: {
    type: 'keyword',
    _meta: {
      description: 'The space the action policy belongs to.',
      optional: false,
    },
  },
  created_at: {
    type: 'date',
    _meta: {
      description:
        'ISO timestamp of when the action policy was created. Absent when the action policy could not be read.',
      optional: true,
    },
  },
  enabled: {
    type: 'boolean',
    _meta: {
      description:
        'Whether the action policy was enabled after the operation (for a delete, whether it was enabled when deleted). Absent when the action policy could not be read.',
      optional: true,
    },
  },
  destination_count: {
    type: 'integer',
    _meta: {
      description:
        'The number of destinations the action policy notifies. Absent when the action policy could not be read.',
      optional: true,
    },
  },
  matcher_type: {
    type: 'keyword',
    _meta: {
      description:
        'How the action policy selects alerts: `none` for a catch-all policy, `tags`, `expression`, or `tags_and_expression`. Absent when the action policy could not be read.',
      optional: true,
    },
  },
  grouping_mode: {
    type: 'keyword',
    _meta: {
      description:
        'The grouping mode the policy sets: `per_alert`, `all` or `per_field`. Absent when the policy sets no grouping, in which case notifications are sent `per_alert`, or when the action policy could not be read.',
      optional: true,
    },
  },
  throttle_strategy: {
    type: 'keyword',
    _meta: {
      description:
        'The throttle strategy the policy sets. Absent when the policy sets no throttle, in which case the strategy defaults to `on_status_change` for `per_alert` grouping and `time_interval` otherwise, or when the action policy could not be read.',
      optional: true,
    },
  },
  snoozed: {
    type: 'boolean',
    _meta: {
      description:
        'Whether the action policy was snoozed at the time of the operation. An expired snooze is not reported as snoozed. Absent when the action policy could not be read.',
      optional: true,
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
  const policyMatcher = PolicyMatcher.of(matcher);
  const hasTags = policyMatcher.hasTags();
  const hasExpression = policyMatcher.expressionKql() !== null;

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
): Omit<ActionPolicyChangedEbtData, 'action_policy_id' | 'space_id' | 'origin'> => {
  const {
    created_at: createdAt,
    enabled,
    destinations,
    grouping,
    throttle,
    snoozed_until: snoozedUntil,
  } = policy;

  return {
    created_at: createdAt,
    enabled,
    destination_count: destinations.length,
    matcher_type: getMatcherType(policy),
    ...(grouping ? { grouping_mode: grouping.mode } : {}),
    ...(throttle ? { throttle_strategy: throttle.strategy } : {}),
    snoozed: snoozedUntil != null && new Date(snoozedUntil).getTime() > Date.now(),
  };
};

/**
 * Projects an action policy change telemetry payload. Policy fields are omitted when `policy` is
 * absent. Names, descriptions, matcher contents, grouping fields, destinations and actors are not
 * reported.
 */
export const buildActionPolicyChangedEventData = (
  policy: ActionPolicyResponse | undefined,
  origin: EventOrigin,
  actionPolicyId: string,
  spaceId: string
): ActionPolicyChangedEbtData => ({
  action_policy_id: actionPolicyId,
  space_id: spaceId,
  ...(policy ? buildActionPolicyFields(policy) : {}),
  origin,
});
