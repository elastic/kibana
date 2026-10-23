/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createMockEbtService } from '../../services/ebt_service/ebt_service.mock';
import type { EbtServiceContract } from '../../services/ebt_service/ebt_service';
import { createLoggerService } from '../../services/logger_service/logger_service.mock';
import { WORKFLOW_DISPATCHED_EBT_EVENT_TYPE } from '../../telemetry/workflow_ebt_schema';
import {
  DISPATCHER_EXECUTION_COMPLETED_EVENT_TYPE,
  type AlertingDomainEvent,
  type AlertingPublisherContext,
  type DispatchedWorkflow,
  type DispatcherExecutionCompletedEvent,
} from '../domain_events';
import type { EventBus } from '../event_bus';
import { createEventBusMock } from '../event_bus/event_bus.mock';
import { DispatcherTelemetrySubscriber } from './dispatcher_telemetry_subscriber';

type CapturedHandler = (
  event: AlertingDomainEvent,
  context: AlertingPublisherContext
) => void | Promise<void>;

const delivery = (overrides: Partial<DispatchedWorkflow> = {}): DispatchedWorkflow => ({
  workflowId: 'wf-1',
  actionPolicyId: 'policy-1',
  workflowExecutionId: 'exec-1',
  spaceId: 'space-a',
  ruleIds: ['rule-1', 'rule-2'],
  alertCount: 2,
  throttleStrategy: 'time_interval',
  groupingMode: 'per_field',
  ...overrides,
});

const completedEvent = (deliveries: DispatchedWorkflow[]): DispatcherExecutionCompletedEvent => ({
  type: DISPATCHER_EXECUTION_COMPLETED_EVENT_TYPE,
  payload: { deliveries },
});

describe('DispatcherTelemetrySubscriber', () => {
  let bus: jest.Mocked<EventBus<AlertingDomainEvent, AlertingPublisherContext>>;
  let ebtService: jest.Mocked<EbtServiceContract>;
  let subscriber: DispatcherTelemetrySubscriber;
  const context: AlertingPublisherContext = { origin: 'internal' };

  const handler = (): CapturedHandler => {
    const call = bus.subscribe.mock.calls.find(
      ([type]) => type === DISPATCHER_EXECUTION_COMPLETED_EVENT_TYPE
    );
    if (!call) {
      throw new Error('No handler registered');
    }
    return call[1] as CapturedHandler;
  };

  beforeEach(() => {
    bus = createEventBusMock<AlertingDomainEvent, AlertingPublisherContext>();
    ebtService = createMockEbtService();
    subscriber = new DispatcherTelemetrySubscriber(
      bus,
      ebtService,
      createLoggerService().loggerService
    );
  });

  describe('start()', () => {
    it('subscribes to the dispatcher execution completed event', () => {
      subscriber.start();

      expect(bus.subscribe).toHaveBeenCalledTimes(1);
      expect(bus.subscribe).toHaveBeenCalledWith(
        DISPATCHER_EXECUTION_COMPLETED_EVENT_TYPE,
        expect.any(Function)
      );
    });

    it('is idempotent: a second call does not double-subscribe', () => {
      subscriber.start();
      subscriber.start();

      expect(bus.subscribe).toHaveBeenCalledTimes(1);
    });
  });

  describe('stop()', () => {
    it('unsubscribes and allows starting again', () => {
      const unsubscribe = jest.fn();
      bus.subscribe.mockReturnValue({ unsubscribe });

      subscriber.start();
      subscriber.stop();
      subscriber.start();

      expect(unsubscribe).toHaveBeenCalledTimes(1);
      expect(bus.subscribe).toHaveBeenCalledTimes(2);
    });
  });

  describe('event dispatch', () => {
    it('reports the projected EBT event for a delivery', async () => {
      subscriber.start();

      await handler()(completedEvent([delivery()]), context);

      expect(ebtService.reportEvent).toHaveBeenCalledTimes(1);
      expect(ebtService.reportEvent).toHaveBeenCalledWith(WORKFLOW_DISPATCHED_EBT_EVENT_TYPE, {
        workflow_id: 'wf-1',
        action_policy_id: 'policy-1',
        workflow_execution_id: 'exec-1',
        space_id: 'space-a',
        rule_id: ['rule-1', 'rule-2'],
        alert_count: 2,
        rule_count: 2,
        throttle_strategy: 'time_interval',
        grouping_mode: 'per_field',
      });
    });

    it('reports one EBT event per delivery', async () => {
      subscriber.start();

      await handler()(
        completedEvent([
          delivery({ workflowId: 'wf-1', workflowExecutionId: 'exec-1' }),
          delivery({ workflowId: 'wf-2', workflowExecutionId: 'exec-2' }),
          delivery({ workflowId: 'wf-3', workflowExecutionId: 'exec-3' }),
        ]),
        context
      );

      expect(ebtService.reportEvent).toHaveBeenCalledTimes(3);
    });

    it('reports distinct rule ids and their count', async () => {
      subscriber.start();

      await handler()(completedEvent([delivery({ ruleIds: ['rule-1', 'rule-1', 'rule-2'] })]), context);

      expect(ebtService.reportEvent).toHaveBeenCalledWith(
        WORKFLOW_DISPATCHED_EBT_EVENT_TYPE,
        expect.objectContaining({ rule_id: ['rule-1', 'rule-2'], rule_count: 2 })
      );
    });

    it('does not report when the event has no deliveries', async () => {
      subscriber.start();

      await handler()(completedEvent([]), context);

      expect(ebtService.reportEvent).not.toHaveBeenCalled();
    });
  });
});
