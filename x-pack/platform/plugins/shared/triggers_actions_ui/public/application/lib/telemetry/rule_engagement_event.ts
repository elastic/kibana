/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AnalyticsServiceSetup,
  AnalyticsServiceStart,
  EventTypeOpts,
  RootSchema,
} from '@kbn/core-analytics-browser';

/**
 * A single shared EBT event for the rules list row actions (edit, snooze, mute, disable,
 * delete, clone), distinguished by the `action` field. None of these currently have any
 * telemetry -- there's a security audit log (`ruleAuditEvent` in the alerting plugin) but
 * that's unrelated ECS audit logging, not EBT.
 *
 * These are click/intent signals, fired when the user triggers the action from the UI --
 * not "the action definitely completed" signals (e.g. clicking "Delete" and then cancelling
 * the confirmation modal still reports a `delete` engagement event). This mirrors how the
 * generic core `click` EBT tracker already behaves for un-instrumented buttons.
 */
export const RULE_ENGAGEMENT_EVENT_TYPE = 'rule_engagement_action';

export type RuleEngagementAction =
  | 'edit'
  | 'snooze'
  | 'mute'
  | 'disable'
  | 'enable'
  | 'delete'
  | 'clone';

export interface RuleEngagementEventData {
  action: RuleEngagementAction;
  rule_id: string;
  rule_type_id: string;
}

const schema: RootSchema<RuleEngagementEventData> = {
  action: {
    type: 'keyword',
    _meta: {
      description: 'The rules list row action the user triggered.',
    },
  },
  rule_id: {
    type: 'keyword',
    _meta: {
      description: 'The id of the rule the action was triggered on.',
    },
  },
  rule_type_id: {
    type: 'keyword',
    _meta: {
      description: 'The rule type id of the rule the action was triggered on.',
    },
  },
};

const eventTypeOpts: EventTypeOpts<RuleEngagementEventData> = {
  eventType: RULE_ENGAGEMENT_EVENT_TYPE,
  schema,
};

/** Call once, from the plugin's `setup()`, before any `reportRuleEngagementEvent` calls. */
export function registerRuleEngagementEventType(analytics: AnalyticsServiceSetup) {
  analytics.registerEventType(eventTypeOpts);
}

export function reportRuleEngagementEvent(
  analytics: Pick<AnalyticsServiceStart, 'reportEvent'>,
  data: RuleEngagementEventData
) {
  analytics.reportEvent(RULE_ENGAGEMENT_EVENT_TYPE, data);
}
