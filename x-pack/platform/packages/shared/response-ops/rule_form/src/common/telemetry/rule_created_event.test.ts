/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  RULE_CREATED_EVENT_TYPE,
  registerRuleCreatedEventType,
  reportRuleCreatedEvent,
} from './rule_created_event';

describe('rule_created_event', () => {
  test('registerRuleCreatedEventType registers the rule_created event type', () => {
    const registerEventType = jest.fn();

    registerRuleCreatedEventType({ registerEventType } as never);

    expect(registerEventType).toHaveBeenCalledTimes(1);
    expect(registerEventType).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: RULE_CREATED_EVENT_TYPE })
    );
  });

  test('reportRuleCreatedEvent reports the event with the given data', () => {
    const reportEvent = jest.fn();

    reportRuleCreatedEvent(
      { reportEvent },
      {
        rule_id: 'rule-1',
        rule_type_id: '.es-query',
      }
    );

    expect(reportEvent).toHaveBeenCalledWith(RULE_CREATED_EVENT_TYPE, {
      rule_id: 'rule-1',
      rule_type_id: '.es-query',
    });
  });

  test('reportRuleCreatedEvent forwards optional fields when provided', () => {
    const reportEvent = jest.fn();

    reportRuleCreatedEvent(
      { reportEvent },
      {
        rule_id: 'rule-1',
        rule_type_id: 'slo.rules.burnRate',
        template_id: 'template-1',
        slo_id: 'slo-1',
        dashboard_ids: ['dash-1', 'dash-2'],
      }
    );

    expect(reportEvent).toHaveBeenCalledWith(RULE_CREATED_EVENT_TYPE, {
      rule_id: 'rule-1',
      rule_type_id: 'slo.rules.burnRate',
      template_id: 'template-1',
      slo_id: 'slo-1',
      dashboard_ids: ['dash-1', 'dash-2'],
    });
  });
});
