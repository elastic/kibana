/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import type { LoggerService } from '../../services/logger_service/logger_service';
import { createLoggerService } from '../../services/logger_service/logger_service.mock';
import type { WorkflowServiceContract } from '../../services/workflow_service/workflow_service';
import {
  RULE_EXECUTION_SIGNALS_WRITTEN_EVENT_TYPE,
  type RuleExecutionSignalsWrittenEvent,
} from '../rule_executor_event_publisher/events';
import type { AlertingDomainEvent, AlertingPublisherContext } from '../domain_events';
import { createEventBusMock } from '../event_bus/event_bus.mock';
import type { EventBus, Subscription } from '../event_bus';
import { RuleExecutorWorkflowSubscriber } from './rule_executor_workflow_subscriber';
import { RULE_EXECUTOR_WORKFLOW_TRIGGERS, RULE_SIGNALS_WRITTEN_TRIGGER_ID } from './triggers';

type CapturedHandler = (
  event: AlertingDomainEvent,
  context: AlertingPublisherContext
) => void | Promise<void>;

const signalsWrittenEvent: RuleExecutionSignalsWrittenEvent = {
  type: RULE_EXECUTION_SIGNALS_WRITTEN_EVENT_TYPE,
  payload: {
    occurredAt: '2026-01-01T00:00:00.000Z',
    signalEventCount: 3,
    rule: {
      ruleId: 'signal-rule-1',
      spaceId: 'security-space',
      name: 'Signal rule',
      kind: 'signal',
      query: 'FROM logs-* | LIMIT 10',
      tags: ['security'],
    },
  },
};

describe('RuleExecutorWorkflowSubscriber', () => {
  let bus: jest.Mocked<EventBus<AlertingDomainEvent, AlertingPublisherContext>>;
  let workflowService: jest.Mocked<WorkflowServiceContract>;
  let loggerService: LoggerService;
  let mockLogger: jest.Mocked<Logger>;
  let subscriber: RuleExecutorWorkflowSubscriber;
  let request: KibanaRequest;

  beforeEach(() => {
    bus = createEventBusMock<AlertingDomainEvent, AlertingPublisherContext>();
    workflowService = {
      emitEvent: jest.fn().mockResolvedValue(undefined),
    };
    ({ loggerService, mockLogger } = createLoggerService());
    subscriber = new RuleExecutorWorkflowSubscriber(bus, workflowService, loggerService);
    request = httpServerMock.createKibanaRequest();
  });

  const handlerFor = (eventType: AlertingDomainEvent['type']): CapturedHandler => {
    const call = bus.subscribe.mock.calls.find(([type]) => type === eventType);
    if (!call) {
      throw new Error(`No handler registered for "${eventType}"`);
    }
    return call[1] as CapturedHandler;
  };

  describe('start()', () => {
    it("subscribes one handler per binding in the catalog, using each binding's eventType", () => {
      subscriber.start();

      expect(bus.subscribe).toHaveBeenCalledTimes(RULE_EXECUTOR_WORKFLOW_TRIGGERS.length);

      const subscribedEventTypes = bus.subscribe.mock.calls.map(([eventType]) => eventType);
      const catalogEventTypes = RULE_EXECUTOR_WORKFLOW_TRIGGERS.map((trigger) => trigger.eventType);
      expect(subscribedEventTypes.sort()).toEqual(catalogEventTypes.sort());
    });

    it('is idempotent: a second call does not double-subscribe', () => {
      subscriber.start();
      const firstCallCount = bus.subscribe.mock.calls.length;
      subscriber.start();

      expect(bus.subscribe).toHaveBeenCalledTimes(firstCallCount);
    });
  });

  describe('event dispatch', () => {
    it("forwards context.request through WorkflowService, with the binding's triggerId and payload", async () => {
      subscriber.start();

      await handlerFor(RULE_EXECUTION_SIGNALS_WRITTEN_EVENT_TYPE)(signalsWrittenEvent, { request });

      expect(workflowService.emitEvent).toHaveBeenCalledTimes(1);
      expect(workflowService.emitEvent).toHaveBeenCalledWith(
        request,
        RULE_SIGNALS_WRITTEN_TRIGGER_ID,
        signalsWrittenEvent.payload
      );
    });

    it("catches WorkflowService failures, logs them with the binding's triggerId, and does not let the rejection escape the handler", async () => {
      workflowService.emitEvent.mockRejectedValueOnce(new Error('workflows unreachable'));

      subscriber.start();

      await expect(
        handlerFor(RULE_EXECUTION_SIGNALS_WRITTEN_EVENT_TYPE)(signalsWrittenEvent, { request })
      ).resolves.toBeUndefined();

      expect(mockLogger.error).toHaveBeenCalledTimes(1);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'workflows unreachable',
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'RULE_EXECUTOR_WORKFLOW_SUBSCRIBER_FAILURE',
            type: `RuleExecutorWorkflowSubscriber:${RULE_SIGNALS_WRITTEN_TRIGGER_ID}`,
          }),
        })
      );
    });
  });

  describe('stop()', () => {
    it('unsubscribes every active subscription and clears internal state', () => {
      const unsubscribers: jest.Mock[] = [];
      bus.subscribe.mockImplementation(() => {
        const unsubscribe = jest.fn();
        unsubscribers.push(unsubscribe);
        return { unsubscribe } satisfies Subscription;
      });

      subscriber.start();
      expect(unsubscribers.length).toBe(RULE_EXECUTOR_WORKFLOW_TRIGGERS.length);

      subscriber.stop();

      for (const unsubscribe of unsubscribers) {
        expect(unsubscribe).toHaveBeenCalledTimes(1);
      }
    });

    it('makes a subsequent start() re-subscribe after clearing state', () => {
      subscriber.start();
      const firstCount = bus.subscribe.mock.calls.length;

      subscriber.stop();
      subscriber.start();

      expect(bus.subscribe).toHaveBeenCalledTimes(firstCount * 2);
    });
  });
});
