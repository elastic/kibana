/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { WorkflowsExtensionsServerPluginStart } from '@kbn/workflows-extensions/server';
import { AlertStatusChangedTriggerId } from '../../../../common/workflows/triggers';
import { ALERTING_LOG_CODES } from '../../errors/error_codes';
import type { LoggerService } from '../../services/logger_service/logger_service';
import type { WorkflowService } from '../../services/workflow_service/workflow_service';
import {
  ALERT_STATUS_CHANGED_EVENT_TYPE,
  type AlertStatusChangedEvent,
} from '../alert_status_changed_event_publisher/events';
import type { AlertingDomainEvent, AlertingPublisherContext } from '../domain_events';
import type { EventBus } from '../event_bus';
import { createWorkflowSubscriberMocks, handlerFor } from '../test_utils';
import { AlertStatusChangedWorkflowSubscriber } from './alert_status_changed_workflow_subscriber';

const ruleRunEvent: AlertStatusChangedEvent = {
  type: ALERT_STATUS_CHANGED_EVENT_TYPE,
  payload: {
    spaceId: 'my-space',
    source: 'internal',
    alert: { id: 'alert-1', groupHash: 'hash-1', status: 'active', previousStatus: 'pending' },
    rule: { id: 'rule-1', name: 'Rule 1', tags: ['k8s'] },
    execution: { executionId: 'execution-uuid', scheduledAt: '2025-01-01T00:00:00.000Z' },
  },
};

const clientEvent: AlertStatusChangedEvent = {
  type: ALERT_STATUS_CHANGED_EVENT_TYPE,
  payload: {
    spaceId: 'my-space',
    source: 'datadog',
    alert: { id: 'alert-2', groupHash: 'hash-2', status: 'active', previousStatus: null },
    rule: null,
    execution: null,
  },
};

describe('AlertStatusChangedWorkflowSubscriber', () => {
  let bus: jest.Mocked<EventBus<AlertingDomainEvent, AlertingPublisherContext>>;
  let workflowService: WorkflowService;
  let workflowsExtensions: jest.Mocked<WorkflowsExtensionsServerPluginStart>;
  let mockEmitEvent: jest.Mock;
  let loggerService: LoggerService;
  let mockLogger: jest.Mocked<Logger>;
  let subscriber: AlertStatusChangedWorkflowSubscriber;
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
    subscriber = new AlertStatusChangedWorkflowSubscriber(bus, workflowService, loggerService);
  });

  describe('start()', () => {
    it('subscribes one handler to alert.status.changed', () => {
      subscriber.start();

      expect(bus.subscribe).toHaveBeenCalledTimes(1);
      expect(bus.subscribe).toHaveBeenCalledWith(
        ALERT_STATUS_CHANGED_EVENT_TYPE,
        expect.any(Function)
      );
    });

    it('is idempotent: a second call does not double-subscribe', () => {
      subscriber.start();
      subscriber.start();

      expect(bus.subscribe).toHaveBeenCalledTimes(1);
    });
  });

  describe('event dispatch', () => {
    it('forwards a rule run payload unchanged under the acting request', async () => {
      subscriber.start();

      await handlerFor(bus, ALERT_STATUS_CHANGED_EVENT_TYPE)(ruleRunEvent, {
        request,
        origin: { actor: 'user', channel: 'api' },
      });

      expect(workflowsExtensions.getClient).toHaveBeenCalledWith(request);
      expect(mockEmitEvent).toHaveBeenCalledTimes(1);
      expect(mockEmitEvent).toHaveBeenCalledWith(AlertStatusChangedTriggerId, ruleRunEvent.payload);
    });

    it('forwards an alert events client payload with no rule or execution', async () => {
      subscriber.start();

      await handlerFor(bus, ALERT_STATUS_CHANGED_EVENT_TYPE)(clientEvent, {
        request,
        origin: { actor: 'user', channel: 'api' },
      });

      expect(mockEmitEvent).toHaveBeenCalledWith(AlertStatusChangedTriggerId, clientEvent.payload);
    });

    it('logs emit failures with the rule id and does not let the rejection escape the handler', async () => {
      mockEmitEvent.mockRejectedValueOnce(new Error('workflows unreachable'));
      subscriber.start();

      await expect(
        handlerFor(bus, ALERT_STATUS_CHANGED_EVENT_TYPE)(ruleRunEvent, {
          request,
          origin: { actor: 'user', channel: 'api' },
        })
      ).resolves.toBeUndefined();

      expect(mockLogger.error).toHaveBeenCalledTimes(1);
      expect(mockLogger.error).toHaveBeenCalledWith('workflows unreachable', {
        labels: {
          event_type: ALERT_STATUS_CHANGED_EVENT_TYPE,
          space_id: 'my-space',
          alert_id: 'alert-1',
          rule_id: 'rule-1',
          code: ALERTING_LOG_CODES.EVENTS_ALERT_STATUS_CHANGED_WORKFLOW_SUBSCRIBER_FAILED,
        },
        error: expect.objectContaining({ message: 'workflows unreachable' }),
      });
    });

    it('logs emit failures for alerts with no rule using the space and alert ids', async () => {
      mockEmitEvent.mockRejectedValueOnce(new Error('workflows unreachable'));
      subscriber.start();

      await handlerFor(bus, ALERT_STATUS_CHANGED_EVENT_TYPE)(clientEvent, {
        request,
        origin: { actor: 'user', channel: 'api' },
      });

      expect(mockLogger.error).toHaveBeenCalledWith('workflows unreachable', {
        labels: {
          event_type: ALERT_STATUS_CHANGED_EVENT_TYPE,
          space_id: 'my-space',
          alert_id: 'alert-2',
          code: ALERTING_LOG_CODES.EVENTS_ALERT_STATUS_CHANGED_WORKFLOW_SUBSCRIBER_FAILED,
        },
        error: expect.objectContaining({ message: 'workflows unreachable' }),
      });
    });
  });

  describe('stop()', () => {
    it('unsubscribes and lets a later start() subscribe again', () => {
      const unsubscribe = jest.fn();
      bus.subscribe.mockReturnValue({ unsubscribe });

      subscriber.start();
      subscriber.stop();
      subscriber.start();

      expect(unsubscribe).toHaveBeenCalledTimes(1);
      expect(bus.subscribe).toHaveBeenCalledTimes(2);
    });

    it('is safe to call when no subscription is active', () => {
      expect(() => subscriber.stop()).not.toThrow();
    });
  });
});
