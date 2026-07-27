/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { LoggerService } from '../../services/logger_service/logger_service';
import type { WorkflowService } from '../../services/workflow_service/workflow_service';
import {
  EPISODE_ASSIGNED_EVENT_TYPE,
  type EpisodeAssignedEvent,
} from '../alert_action_event_publisher/events';
import type { AlertingDomainEvent, AlertingPublisherContext } from '../domain_events';
import type { EventBus, Subscription } from '../event_bus';
import { createWorkflowSubscriberMocks, handlerFor } from '../test_utils';
import { AlertActionWorkflowSubscriber } from './alert_action_workflow_subscriber';
import { ALERT_ACTION_WORKFLOW_TRIGGERS, EPISODE_ASSIGNED_TRIGGER_ID } from './triggers';

const episodeAssignedEvent: EpisodeAssignedEvent = {
  type: EPISODE_ASSIGNED_EVENT_TYPE,
  occurredAt: '2025-02-02T12:34:56.000Z',
  groupHash: 'group-hash-1',
  episodeId: 'episode-1',
  ruleId: 'rule-1',
  spaceId: 'my-space',
  actorUid: 'actor-uid-1',
  payload: { assigneeUid: 'assignee-uid-1' },
};

describe('AlertActionWorkflowSubscriber', () => {
  let bus: jest.Mocked<EventBus<AlertingDomainEvent, AlertingPublisherContext>>;
  let workflowService: WorkflowService;
  let mockEmitEvent: jest.Mock;
  let loggerService: LoggerService;
  let mockLogger: jest.Mocked<Logger>;
  let subscriber: AlertActionWorkflowSubscriber;
  let request: KibanaRequest;

  beforeEach(() => {
    ({ bus, workflowService, mockEmitEvent, loggerService, mockLogger, request } =
      createWorkflowSubscriberMocks());
    subscriber = new AlertActionWorkflowSubscriber(bus, workflowService, loggerService);
  });

  describe('start()', () => {
    it("subscribes one handler per binding in the catalog, using each binding's eventType", () => {
      subscriber.start();

      expect(bus.subscribe).toHaveBeenCalledTimes(ALERT_ACTION_WORKFLOW_TRIGGERS.length);

      const subscribedEventTypes = bus.subscribe.mock.calls.map(([eventType]) => eventType);
      const catalogEventTypes = ALERT_ACTION_WORKFLOW_TRIGGERS.map((t) => t.eventType);
      expect(subscribedEventTypes.sort()).toEqual(catalogEventTypes.sort());
    });

    it('is idempotent: a second call logs a warning and does not double-subscribe', () => {
      subscriber.start();
      const firstCallCount = bus.subscribe.mock.calls.length;
      subscriber.start();

      expect(bus.subscribe).toHaveBeenCalledTimes(firstCallCount);
    });
  });

  describe('event dispatch', () => {
    it("forwards context.request through WorkflowService to workflowsExtensions, with the binding's triggerId and the mapped payload", async () => {
      subscriber.start();

      await handlerFor(bus, EPISODE_ASSIGNED_EVENT_TYPE)(episodeAssignedEvent, { request });

      expect(mockEmitEvent).toHaveBeenCalledTimes(1);
      expect(mockEmitEvent).toHaveBeenCalledWith(EPISODE_ASSIGNED_TRIGGER_ID, {
        occurredAt: episodeAssignedEvent.occurredAt,
        groupHash: episodeAssignedEvent.groupHash,
        episodeId: episodeAssignedEvent.episodeId,
        ruleId: episodeAssignedEvent.ruleId,
        spaceId: episodeAssignedEvent.spaceId,
        actorUid: episodeAssignedEvent.actorUid,
        assigneeUid: episodeAssignedEvent.payload.assigneeUid,
      });
    });

    it("catches WorkflowService failures, logs them with the binding's triggerId, and does not let the rejection escape the handler", async () => {
      const failure = new Error('workflows unreachable');
      mockEmitEvent.mockRejectedValueOnce(failure);

      subscriber.start();

      await expect(
        handlerFor(bus, EPISODE_ASSIGNED_EVENT_TYPE)(episodeAssignedEvent, { request })
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
      expect(unsubscribers.length).toBe(ALERT_ACTION_WORKFLOW_TRIGGERS.length);

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
      expect(mockLogger.warn).not.toHaveBeenCalled();
    });

    it('is safe to call when no subscriptions are active', () => {
      expect(() => subscriber.stop()).not.toThrow();
    });
  });
});
