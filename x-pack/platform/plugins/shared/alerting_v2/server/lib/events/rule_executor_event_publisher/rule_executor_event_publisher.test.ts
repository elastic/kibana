/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createRuleExecutorEventPublisher } from './rule_executor_event_publisher.mock';
import {
  RULE_EXECUTION_SUCCEEDED_EVENT_TYPE,
  RULE_EXECUTION_FAILED_EVENT_TYPE,
  type RuleExecutionSucceededPayload,
  type RuleExecutionFailedPayload,
} from './events';

describe('RuleExecutorEventPublisher', () => {
  it('publishes rule.execution.succeeded with the payload and threaded request', () => {
    const { publisher, eventBus, request } = createRuleExecutorEventPublisher();

    const payload: RuleExecutionSucceededPayload = {
      executionId: 'execution-uuid',
      scheduledAt: '2025-01-01T00:00:00.000Z',
      ruleEventsGenerated: 5,
      rule: {
        ruleId: 'rule-1',
        spaceId: 'space-1',
        kind: 'signal',
        tags: ['security', 'siem'],
      },
    };

    publisher.publishExecutionSucceeded(payload);

    expect(eventBus.publish).toHaveBeenCalledTimes(1);
    expect(eventBus.publish).toHaveBeenCalledWith(
      { type: RULE_EXECUTION_SUCCEEDED_EVENT_TYPE, payload },
      { request }
    );
  });

  it('publishes rule.execution.failed with the payload and threaded request', () => {
    const { publisher, eventBus, request } = createRuleExecutorEventPublisher();

    const payload: RuleExecutionFailedPayload = {
      rule: { id: 'rule-1', spaceId: 'space-1' },
      error: 'Something went wrong',
    };

    publisher.publishExecutionFailed(payload);

    expect(eventBus.publish).toHaveBeenCalledTimes(1);
    expect(eventBus.publish).toHaveBeenCalledWith(
      { type: RULE_EXECUTION_FAILED_EVENT_TYPE, payload },
      { request }
    );
  });
});
