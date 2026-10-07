/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock, httpServerMock } from '@kbn/core/server/mocks';
import {
  createWorkflowsClientMock,
  workflowsExtensionsMock,
} from '@kbn/workflows-extensions/server/mocks';
import { AlertStatusChangedWorkflowSubscriber } from './alert_status_changed_subscriber';
import { AsyncDomainEventBus } from '../events/event_bus';
import { AlertStatusChangedTriggerId } from '../../../common/workflows/triggers';
import type {
  AlertStatusChangedEvent,
  AlertingDomainEvent,
  AlertingPublisherContext,
} from './events';
import { ALERT_STATUS_CHANGED_EVENT_TYPE } from './events';

const makeEvent = (): AlertStatusChangedEvent => ({
  type: ALERT_STATUS_CHANGED_EVENT_TYPE,
  payload: {
    rule: {
      id: 'rule-1',
      name: 'Test Rule',
      spaceId: 'default',
      consumer: 'alerts',
      ruleTypeId: '.esql',
      tags: ['k8s'],
      ruleTypeName: 'Elasticsearch query',
    },
    alert: {
      id: 'alert-a',
      uuid: 'uuid-a',
      status: 'active',
      actionGroup: 'default',
      start: '2026-09-30T00:00:00.000Z',
    },
  },
});

const makeContext = (): AlertingPublisherContext => ({
  request: httpServerMock.createKibanaRequest(),
});

// The bus delivers events from a setImmediate callback, and the handler then awaits mocked
// promises. Wait for two turns of the event loop so both the delivery and the handler's
// async work are done before the assertions run.
const nextTurn = () => new Promise<void>((resolve) => setImmediate(resolve));
const flushBus = async () => {
  await nextTurn();
  await nextTurn();
};

describe('AlertStatusChangedWorkflowSubscriber', () => {
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;
  let bus: AsyncDomainEventBus<AlertingDomainEvent, AlertingPublisherContext>;
  let subscribeSpy: jest.SpyInstance;
  let workflows: ReturnType<typeof workflowsExtensionsMock.createStart>;
  let mockEmitEvent: jest.Mock;
  let subscriber: AlertStatusChangedWorkflowSubscriber;

  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
    bus = new AsyncDomainEventBus<AlertingDomainEvent, AlertingPublisherContext>(logger);
    subscribeSpy = jest.spyOn(bus, 'subscribe');

    mockEmitEvent = jest.fn().mockResolvedValue(undefined);
    workflows = workflowsExtensionsMock.createStart();
    workflows.getClient.mockResolvedValue(
      createWorkflowsClientMock({ isWorkflowsAvailable: true, emitEvent: mockEmitEvent })
    );

    subscriber = new AlertStatusChangedWorkflowSubscriber(bus, workflows, logger);
  });

  describe('start()', () => {
    it('subscribes to the bus on the alert.status.changed event type', () => {
      subscriber.start();
      expect(subscribeSpy).toHaveBeenCalledTimes(1);
      expect(subscribeSpy).toHaveBeenCalledWith(
        ALERT_STATUS_CHANGED_EVENT_TYPE,
        expect.any(Function)
      );
    });

    it('calling start() a second time does not create a second subscription', () => {
      subscriber.start();
      subscriber.start();
      expect(subscribeSpy).toHaveBeenCalledTimes(1);
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
      const unsubscribeSpy = jest.spyOn(subscribeSpy.mock.results[0].value, 'unsubscribe');
      subscriber.stop();
      expect(unsubscribeSpy).toHaveBeenCalledTimes(1);
    });

    it('stops forwarding events once stopped', async () => {
      subscriber.start();
      subscriber.stop();

      bus.publish(makeEvent(), makeContext());
      await flushBus();

      expect(mockEmitEvent).not.toHaveBeenCalled();
    });

    it('calling stop() before start() does not throw', () => {
      expect(() => subscriber.stop()).not.toThrow();
    });

    it('after stop(), start() can subscribe again', () => {
      subscriber.start();
      subscriber.stop();
      subscriber.start();
      expect(subscribeSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('emit behavior (events published through the bus)', () => {
    beforeEach(() => {
      subscriber.start();
    });

    it('calls emitEvent with the trigger ID and payload when workflows are available', async () => {
      const event = makeEvent();
      bus.publish(event, makeContext());
      await flushBus();

      expect(mockEmitEvent).toHaveBeenCalledTimes(1);
      expect(mockEmitEvent).toHaveBeenCalledWith(AlertStatusChangedTriggerId, event.payload);
    });

    it('skips emitEvent when isWorkflowsAvailable is false', async () => {
      workflows.getClient.mockResolvedValue(
        createWorkflowsClientMock({ isWorkflowsAvailable: false, emitEvent: mockEmitEvent })
      );

      bus.publish(makeEvent(), makeContext());
      await flushBus();

      expect(mockEmitEvent).not.toHaveBeenCalled();
    });

    it('logs a warning with the rule id, alert uuid and stack if emitEvent throws', async () => {
      mockEmitEvent.mockRejectedValue(new Error('emit failed'));

      bus.publish(makeEvent(), makeContext());
      await flushBus();

      const warnings = loggingSystemMock.collect(logger).warn;
      expect(warnings).toHaveLength(1);
      const [message, meta] = warnings[0];
      expect(message).toEqual(expect.stringContaining('emit failed'));
      expect(message).toEqual(expect.stringContaining('rule-1'));
      expect(message).toEqual(expect.stringContaining('uuid-a'));
      expect(meta).toEqual({ error: { stack_trace: expect.stringContaining('emit failed') } });
      expect(loggingSystemMock.collect(logger).error).toHaveLength(0);
    });

    it('logs a warning and does not propagate if getClient throws', async () => {
      workflows.getClient.mockRejectedValue(new Error('client unavailable'));

      bus.publish(makeEvent(), makeContext());
      await flushBus();

      expect(loggingSystemMock.collect(logger).warn).toEqual(
        expect.arrayContaining([
          expect.arrayContaining([expect.stringContaining('client unavailable')]),
        ])
      );
    });
  });
});
