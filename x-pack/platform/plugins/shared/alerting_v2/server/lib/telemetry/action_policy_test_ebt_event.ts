/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GroupingMode } from '@kbn/alerting-v2-schemas';
import type { EventTypeOpts } from '@kbn/core/server';
import type { ActionPolicyEbtMatcherType } from './action_policy_ebt_schema';

export const ACTION_POLICY_TEST_SENT_EBT_EVENT_TYPE =
  'alerting_v2_action_policy_test_sent' as const;

export type ActionPolicyTestSentEbtEventType = typeof ACTION_POLICY_TEST_SENT_EBT_EVENT_TYPE;

/** Reported once per test notification send. Names, matcher contents and workflow ids are not reported. */
export interface ActionPolicyTestSentEbtData {
  action_policy_id: string;
  space_id: string;
  grouping_mode: GroupingMode;
  matcher_type: ActionPolicyEbtMatcherType;
  alert_count: number;
  destination_count: number;
  started_count: number;
  failed_count: number;
}

export const actionPolicyTestSentTelemetryEvent: EventTypeOpts<ActionPolicyTestSentEbtData> = {
  eventType: ACTION_POLICY_TEST_SENT_EBT_EVENT_TYPE,
  schema: {
    action_policy_id: {
      type: 'keyword',
      _meta: { description: 'The id of the tested action policy.', optional: false },
    },
    space_id: {
      type: 'keyword',
      _meta: { description: 'The space the action policy belongs to.', optional: false },
    },
    grouping_mode: {
      type: 'keyword',
      _meta: {
        description: 'The grouping mode of the policy: `per_alert`, `all` or `per_field`.',
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
    alert_count: {
      type: 'integer',
      _meta: { description: 'The number of synthetic alerts in the payload.', optional: false },
    },
    destination_count: {
      type: 'integer',
      _meta: { description: 'The number of destinations the test was sent to.', optional: false },
    },
    started_count: {
      type: 'integer',
      _meta: { description: 'The number of workflow test runs started.', optional: false },
    },
    failed_count: {
      type: 'integer',
      _meta: {
        description: 'The number of destinations whose workflow test run could not be started.',
        optional: false,
      },
    },
  },
};
