/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  RULE_ENGAGEMENT_EVENT_TYPE,
  registerRuleEngagementEventType,
  reportRuleEngagementEvent,
} from './rule_engagement_event';

describe('rule_engagement_event', () => {
  test('registerRuleEngagementEventType registers the rule_engagement_action event type', () => {
    const registerEventType = jest.fn();

    registerRuleEngagementEventType({ registerEventType } as never);

    expect(registerEventType).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: RULE_ENGAGEMENT_EVENT_TYPE })
    );
  });

  test.each(['edit', 'snooze', 'mute', 'disable', 'delete', 'clone'] as const)(
    'reportRuleEngagementEvent reports a %s action',
    (action) => {
      const reportEvent = jest.fn();

      reportRuleEngagementEvent(
        { reportEvent },
        { action, rule_id: 'rule-1', rule_type_id: '.es-query' }
      );

      expect(reportEvent).toHaveBeenCalledWith(RULE_ENGAGEMENT_EVENT_TYPE, {
        action,
        rule_id: 'rule-1',
        rule_type_id: '.es-query',
      });
    }
  );
});
