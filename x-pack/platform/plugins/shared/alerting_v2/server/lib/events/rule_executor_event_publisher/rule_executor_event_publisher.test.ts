/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createRuleExecutorEventPublisher } from './rule_executor_event_publisher.mock';
import { RULE_EXECUTION_COMPLETED_EVENT_TYPE } from './events';

describe('RuleExecutorEventPublisher', () => {
  it('publishes rule.execution.completed with the payload and threaded request', () => {
    const { publisher, eventBus, request } = createRuleExecutorEventPublisher();

    const payload = {
      executionId: 'execution-uuid',
      ruleId: 'rule-1',
      spaceId: 'space-1',
      scheduledAt: '2025-01-01T00:00:00.000Z',
      startedAt: '2025-01-01T00:00:00.000Z',
      endedAt: '2025-01-01T00:00:01.000Z',
      durationMs: 1000,
      counters: { signalsGenerated: 5 },
    };

    publisher.publishExecutionCompleted(payload);

    expect(eventBus.publish).toHaveBeenCalledTimes(1);
    expect(eventBus.publish).toHaveBeenCalledWith(
      { type: RULE_EXECUTION_COMPLETED_EVENT_TYPE, payload },
      { request }
    );
  });
});
