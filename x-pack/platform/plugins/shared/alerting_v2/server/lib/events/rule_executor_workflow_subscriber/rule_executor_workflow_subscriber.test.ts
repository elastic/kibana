/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { WorkflowsExtensionsServerPluginStart } from '@kbn/workflows-extensions/server';
import type { LoggerService } from '../../services/logger_service/logger_service';
import type { WorkflowService } from '../../services/workflow_service/workflow_service';
import {
  RULE_EXECUTION_SUCCEEDED_EVENT_TYPE,
  RULE_EXECUTION_FAILED_EVENT_TYPE,
  type RuleExecutionSucceededEvent,
  type RuleExecutionFailedEvent,
} from '../rule_executor_event_publisher/events';
import type { AlertingDomainEvent, AlertingPublisherContext } from '../domain_events';
import type { EventBus, Subscription } from '../event_bus';
import { createWorkflowSubscriberMocks, handlerFor } from '../test_utils';
import { RuleExecutorWorkflowSubscriber } from './rule_executor_workflow_subscriber';
import {
  RULE_EXECUTOR_WORKFLOW_TRIGGERS,
  RuleEventsGeneratedTriggerId,
  RuleExecutionFailedTriggerId,
} from './triggers';

const succeededEvent: RuleExecutionSucceededEvent = {
  type: RULE_EXECUTION_SUCCEEDED_EVENT_TYPE,
  payload: {
    executionId: 'execution-uuid',
    scheduledAt: '2025-01-01T00:00:00.000Z',
    ruleEventsGenerated: 4,
    rule: {
      ruleId: 'rule-1',
      spaceId: 'my-space',
      kind: 'signal',
      tags: ['security'],
    },
  },
};

const failedEvent: RuleExecutionFailedEvent = {
  type: RULE_EXECUTION_FAILED_EVENT_TYPE,
  payload: { rule: { id: 'rule-1', spaceId: 'my-space' }, error: 'boom' },
};

describe('RuleExecutorWorkflowSubscriber', () => {
  let bus: jest.Mocked<EventBus<AlertingDomainEvent, AlertingPublisherContext>>;
  let workflowService: WorkflowService;
  let workflowsExtensions: jest.Mocked<WorkflowsExtensionsServerPluginStart>;
  let mockEmitEvent: jest.Mock;
  let loggerService: LoggerService;
  let mockLogger: jest.Mocked<Logger>;
  let subscriber: RuleExecutorWorkflowSubscriber;
  let request: KibanaRequest;

  beforeEach(() => {
    ({
      bus,
      workflowService,
      workflowsExtensions,
      mockEmitEvent,
      loggerService,
      mockLogger,
      request,
    } = createWorkflowSubscriberMocks());
    subscriber = new RuleExecutorWorkflowSubscriber(bus, workflowService, loggerService);
  });

  describe('start()', () => {
    it("subscribes one handler per binding in the catalog, using each binding's eventType", () => {
      subscriber.start();

      expect(bus.subscribe).toHaveBeenCalledTimes(RULE_EXECUTOR_WORKFLOW_TRIGGERS.length);

      const subscribedEventTypes = bus.subscribe.mock.calls.map(([eventType]) => eventType);
      const catalogEventTypes = RULE_EXECUTOR_WORKFLOW_TRIGGERS.map((t) => t.eventType);
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
    it('forwards a succeeded event as the reshaped workflow payload under the acting request', async () => {
      subscriber.start();

      await handlerFor(bus, RULE_EXECUTION_SUCCEEDED_EVENT_TYPE)(succeededEvent, { request });

      expect(workflowsExtensions.getClient).toHaveBeenCalledWith(request);
      expect(mockEmitEvent).toHaveBeenCalledTimes(1);
      expect(mockEmitEvent).toHaveBeenCalledWith(RuleEventsGeneratedTriggerId, {
        rule: { id: 'rule-1', spaceId: 'my-space', kind: 'signal', tags: ['security'] },
        execution: { executionId: 'execution-uuid', scheduledAt: '2025-01-01T00:00:00.000Z' },
        ruleEventsGenerated: 4,
      });
    });

    it('forwards a failed event as { rule: { id, spaceId }, error }', async () => {
      subscriber.start();

      await handlerFor(bus, RULE_EXECUTION_FAILED_EVENT_TYPE)(failedEvent, { request });

      expect(mockEmitEvent).toHaveBeenCalledTimes(1);
      expect(mockEmitEvent).toHaveBeenCalledWith(RuleExecutionFailedTriggerId, {
        rule: { id: 'rule-1', spaceId: 'my-space' },
        error: 'boom',
      });
    });

    it('skips emission when a succeeded run produced no rule events (binding gate returns null)', async () => {
      subscriber.start();

      await handlerFor(bus, RULE_EXECUTION_SUCCEEDED_EVENT_TYPE)(
        { ...succeededEvent, payload: { ...succeededEvent.payload, ruleEventsGenerated: 0 } },
        { request }
      );

      expect(mockEmitEvent).not.toHaveBeenCalled();
    });

    it('catches WorkflowService failures, logs them, and does not let the rejection escape the handler', async () => {
      mockEmitEvent.mockRejectedValueOnce(new Error('workflows unreachable'));

      subscriber.start();

      await expect(
        handlerFor(bus, RULE_EXECUTION_SUCCEEDED_EVENT_TYPE)(succeededEvent, { request })
      ).resolves.toBeUndefined();

      expect(mockLogger.error).toHaveBeenCalledTimes(1);
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

    it('makes a subsequent start() re-subscribe (state cleared)', () => {
      subscriber.start();
      const firstCount = bus.subscribe.mock.calls.length;

      subscriber.stop();
      subscriber.start();

      expect(bus.subscribe).toHaveBeenCalledTimes(firstCount * 2);
    });

    it('is safe to call when no subscriptions are active', () => {
      expect(() => subscriber.stop()).not.toThrow();
    });
  });
});
