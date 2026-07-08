/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import type { EventBus } from '../event_bus';
import type { AlertingDomainEvent, AlertingPublisherContext } from '../domain_events';
import { createEventBusMock } from '../event_bus/event_bus.mock';
import { createRuleResponse } from '../../test_utils';
import { RULE_EXECUTION_SIGNALS_WRITTEN_EVENT_TYPE } from './events';
import { RuleExecutorEventPublisher } from './rule_executor_event_publisher';

describe('RuleExecutorEventPublisher', () => {
  jest.useFakeTimers().setSystemTime(new Date('2026-01-01T00:00:00.000Z'));

  let publisher: RuleExecutorEventPublisher;
  let eventBus: jest.Mocked<EventBus<AlertingDomainEvent, AlertingPublisherContext>>;
  let request: KibanaRequest;

  beforeEach(() => {
    eventBus = createEventBusMock<AlertingDomainEvent, AlertingPublisherContext>();
    publisher = new RuleExecutorEventPublisher(eventBus);
    request = httpServerMock.createKibanaRequest();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('publishes a signals-written event for signal rules with persisted signal events', () => {
    const rule = createRuleResponse({
      id: 'signal-rule-1',
      kind: 'signal',
      metadata: {
        name: 'Signal rule',
        tags: ['security'],
      },
      query: { format: 'standalone', breach: { query: 'FROM logs-* | LIMIT 10' } },
    });

    publisher.emitSignalsWritten(request, {
      rule,
      spaceId: 'security-space',
      signalEventCount: 2,
    });

    expect(eventBus.publish).toHaveBeenCalledTimes(1);
    expect(eventBus.publish).toHaveBeenCalledWith(
      {
        type: RULE_EXECUTION_SIGNALS_WRITTEN_EVENT_TYPE,
        payload: {
          occurredAt: '2026-01-01T00:00:00.000Z',
          signalEventCount: 2,
          rule: {
            ruleId: 'signal-rule-1',
            spaceId: 'security-space',
            name: 'Signal rule',
            kind: 'signal',
            query: 'FROM logs-* | LIMIT 10',
            tags: ['security'],
          },
        },
      },
      { request }
    );
  });

  it('does not publish when no signal events were written', () => {
    publisher.emitSignalsWritten(request, {
      rule: createRuleResponse({ kind: 'signal' }),
      spaceId: 'default',
      signalEventCount: 0,
    });

    expect(eventBus.publish).not.toHaveBeenCalled();
  });

  it('does not publish for non-signal rules', () => {
    publisher.emitSignalsWritten(request, {
      rule: createRuleResponse({ kind: 'alert' }),
      spaceId: 'default',
      signalEventCount: 1,
    });

    expect(eventBus.publish).not.toHaveBeenCalled();
  });
});
