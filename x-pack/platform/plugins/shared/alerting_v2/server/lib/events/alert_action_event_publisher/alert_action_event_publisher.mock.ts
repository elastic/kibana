/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { EventBus } from '../event_bus';
import { createEventBusMock } from '../event_bus/event_bus.mock';
import type { AlertingDomainEvent, AlertingPublisherContext } from '../domain_events';
import { createLoggerService } from '../../services/logger_service/logger_service.mock';
import { AlertActionEventPublisher } from './alert_action_event_publisher';

/**
 * Builds a real {@link AlertActionEventPublisher} wired to a jest-mocked
 * {@link EventBus}. Use this when you want to test the publisher's
 * translation and dispatch behaviour.
 */
export function createAlertActionEventPublisher(): {
  publisher: AlertActionEventPublisher;
  eventBus: jest.Mocked<EventBus<AlertingDomainEvent, AlertingPublisherContext>>;
  mockLogger: jest.Mocked<Logger>;
} {
  const eventBus = createEventBusMock<AlertingDomainEvent, AlertingPublisherContext>();
  const { loggerService, mockLogger } = createLoggerService();

  return {
    publisher: new AlertActionEventPublisher(eventBus, loggerService),
    eventBus,
    mockLogger,
  };
}
