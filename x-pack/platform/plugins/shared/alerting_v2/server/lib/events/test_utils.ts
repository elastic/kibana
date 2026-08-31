/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import type { WorkflowsExtensionsServerPluginStart } from '@kbn/workflows-extensions/server';
import { createWorkflowsClientMock } from '@kbn/workflows-extensions/server/mocks';
import type { LoggerService } from '../services/logger_service/logger_service';
import { createLoggerService } from '../services/logger_service/logger_service.mock';
import type { WorkflowService } from '../services/workflow_service/workflow_service';
import { createWorkflowService } from '../services/workflow_service/workflow_service.mock';
import type { AlertingDomainEvent, AlertingPublisherContext } from './domain_events';
import { createEventBusMock } from './event_bus/event_bus.mock';
import type { EventBus } from './event_bus';

/**
 * Signature of the handler a workflow subscriber registers on the bus via
 * `bus.subscribe(eventType, handler)`.
 */
export type CapturedHandler = (
  event: AlertingDomainEvent,
  context: AlertingPublisherContext
) => void | Promise<void>;

export interface WorkflowSubscriberMocks {
  bus: jest.Mocked<EventBus<AlertingDomainEvent, AlertingPublisherContext>>;
  workflowService: WorkflowService;
  workflowsExtensions: jest.Mocked<WorkflowsExtensionsServerPluginStart>;
  mockEmitEvent: jest.Mock;
  loggerService: LoggerService;
  mockLogger: jest.Mocked<Logger>;
  request: KibanaRequest;
}

/**
 * Builds the standard dependency set every workflow-subscriber unit test needs:
 * a mocked domain-event bus, a WorkflowService whose client captures
 * `emitEvent`, a spied logger, and an acting request. Each suite constructs its
 * own subscriber from these because the subscriber class differs per suite.
 */
export const createWorkflowSubscriberMocks = (): WorkflowSubscriberMocks => {
  const bus = createEventBusMock<AlertingDomainEvent, AlertingPublisherContext>();

  const { workflowService, workflowsExtensions } = createWorkflowService();
  const mockEmitEvent = jest.fn().mockResolvedValue(undefined);
  workflowsExtensions.getClient.mockResolvedValue(
    createWorkflowsClientMock({ emitEvent: mockEmitEvent })
  );

  const { loggerService, mockLogger } = createLoggerService();
  const request = httpServerMock.createKibanaRequest();

  return {
    bus,
    workflowService,
    workflowsExtensions,
    mockEmitEvent,
    loggerService,
    mockLogger,
    request,
  };
};

/**
 * Captures the handler the subscriber registered on `bus` for `eventType` so
 * tests can invoke it directly, bypassing the real bus dispatch.
 */
export const handlerFor = (
  bus: jest.Mocked<EventBus<AlertingDomainEvent, AlertingPublisherContext>>,
  eventType: AlertingDomainEvent['type']
): CapturedHandler => {
  const call = bus.subscribe.mock.calls.find(([type]) => type === eventType);
  if (!call) {
    throw new Error(`No handler registered for "${eventType}"`);
  }
  return call[1] as CapturedHandler;
};
