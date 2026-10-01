/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock, httpServerMock } from '@kbn/core/server/mocks';
import { AlertStatusChangedWorkflowSubscriber } from './alert_status_changed_subscriber';
import { AlertStatusChangedV1TriggerId } from '../../../common/workflows/triggers';
import type { AlertStatusChangedEvent, AlertingPublisherContext } from './events';
import { ALERT_STATUS_CHANGED_EVENT_TYPE } from './events';

const makePayload = (): AlertStatusChangedEvent['payload'] => ({
  rule: {
    id: 'rule-1',
    name: 'Test Rule',
    spaceId: 'default',
    consumer: 'alerts',
    ruleTypeId: '.esql',
    tags: ['k8s'],
    ruleCategory: 'Elasticsearch query',
  },
  alert: {
    id: 'alert-a',
    uuid: 'uuid-a',
    status: 'active',
    actionGroup: 'default',
    start: '2026-09-30T00:00:00.000Z',
  },
});

const makeContext = (): AlertingPublisherContext => ({
  request: httpServerMock.createKibanaRequest(),
});

describe('AlertStatusChangedWorkflowSubscriber', () => {
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;
  let mockUnsubscribe: jest.Mock;
  let mockSubscribe: jest.Mock;
  let mockBus: { subscribe: jest.Mock };
  let mockEmitEvent: jest.Mock;
  let mockGetClient: jest.Mock;
  let mockWorkflows: { getClient: jest.Mock };
  let subscriber: AlertStatusChangedWorkflowSubscriber;

  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
    mockUnsubscribe = jest.fn();
    mockSubscribe = jest.fn().mockReturnValue({ unsubscribe: mockUnsubscribe });
    mockBus = { subscribe: mockSubscribe };

    mockEmitEvent = jest.fn().mockResolvedValue(undefined);
    mockGetClient = jest.fn().mockResolvedValue({
      isWorkflowsAvailable: true,
      emitEvent: mockEmitEvent,
    });
    mockWorkflows = { getClient: mockGetClient };

    subscriber = new AlertStatusChangedWorkflowSubscriber(
      // @ts-ignore — partial mock
      mockBus,
      mockWorkflows,
      logger
    );
  });

  describe('start()', () => {
    it('subscribes to the bus on the alert.status.changed event type', () => {
      subscriber.start();
      expect(mockSubscribe).toHaveBeenCalledTimes(1);
      expect(mockSubscribe).toHaveBeenCalledWith(
        ALERT_STATUS_CHANGED_EVENT_TYPE,
        expect.any(Function)
      );
    });

    it('calling start() a second time does not create a second subscription', () => {
      subscriber.start();
      subscriber.start();
      expect(mockSubscribe).toHaveBeenCalledTimes(1);
    });

    it('logs a debug message on the second start() call', () => {
      subscriber.start();
      subscriber.start();
      expect(loggingSystemMock.collect(logger).debug).toEqual(
        expect.arrayContaining([
          expect.arrayContaining([expect.stringContaining('start called more than once')]),
        ])
      );
    });
  });

  describe('stop()', () => {
    it('unsubscribes from the bus', () => {
      subscriber.start();
      subscriber.stop();
      expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
    });

    it('calling stop() before start() does not throw', () => {
      expect(() => subscriber.stop()).not.toThrow();
    });

    it('after stop(), start() can subscribe again', () => {
      subscriber.start();
      subscriber.stop();
      subscriber.start();
      expect(mockSubscribe).toHaveBeenCalledTimes(2);
    });
  });

  describe('emit behavior (invoked via the bus handler)', () => {
    let capturedHandler: (
      event: AlertStatusChangedEvent,
      context: AlertingPublisherContext
    ) => Promise<void>;

    beforeEach(() => {
      subscriber.start();
      capturedHandler = mockSubscribe.mock.calls[0][1];
    });

    it('calls emitEvent with the trigger ID and payload when workflows are available', async () => {
      const event: AlertStatusChangedEvent = {
        type: ALERT_STATUS_CHANGED_EVENT_TYPE,
        payload: makePayload(),
      };
      await capturedHandler(event, makeContext());

      expect(mockEmitEvent).toHaveBeenCalledTimes(1);
      expect(mockEmitEvent).toHaveBeenCalledWith(AlertStatusChangedV1TriggerId, event.payload);
    });

    it('skips emitEvent when isWorkflowsAvailable is false', async () => {
      mockGetClient.mockResolvedValue({ isWorkflowsAvailable: false, emitEvent: mockEmitEvent });

      const event: AlertStatusChangedEvent = {
        type: ALERT_STATUS_CHANGED_EVENT_TYPE,
        payload: makePayload(),
      };
      await capturedHandler(event, makeContext());

      expect(mockEmitEvent).not.toHaveBeenCalled();
    });

    it('logs an error and does not propagate if emitEvent throws', async () => {
      mockEmitEvent.mockRejectedValue(new Error('emit failed'));

      const event: AlertStatusChangedEvent = {
        type: ALERT_STATUS_CHANGED_EVENT_TYPE,
        payload: makePayload(),
      };
      await expect(capturedHandler(event, makeContext())).resolves.toBeUndefined();

      expect(loggingSystemMock.collect(logger).error).toEqual(
        expect.arrayContaining([
          expect.arrayContaining([expect.stringContaining('emit failed')]),
        ])
      );
    });

    it('logs an error and does not propagate if getClient throws', async () => {
      mockGetClient.mockRejectedValue(new Error('client unavailable'));

      const event: AlertStatusChangedEvent = {
        type: ALERT_STATUS_CHANGED_EVENT_TYPE,
        payload: makePayload(),
      };
      await expect(capturedHandler(event, makeContext())).resolves.toBeUndefined();

      expect(loggingSystemMock.collect(logger).error).toEqual(
        expect.arrayContaining([
          expect.arrayContaining([expect.stringContaining('client unavailable')]),
        ])
      );
    });
  });
});
