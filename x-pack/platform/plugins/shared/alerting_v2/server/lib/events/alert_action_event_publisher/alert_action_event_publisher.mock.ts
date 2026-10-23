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
import type { EbtServiceContract } from '../../services/ebt_service/ebt_service';
import { createMockEbtService } from '../../services/ebt_service/ebt_service.mock';
import { createLoggerService } from '../../services/logger_service/logger_service.mock';
import { AlertActionEventPublisher } from './alert_action_event_publisher';

/**
 * Builds a real {@link AlertActionEventPublisher} wired to a jest-mocked
 * {@link EventBus} and {@link EbtServiceContract}. Use this when you want to
 * test the publisher's translation, dispatch, and telemetry behaviour.
 */
export function createAlertActionEventPublisher(): {
  publisher: AlertActionEventPublisher;
  eventBus: jest.Mocked<EventBus<AlertingDomainEvent, AlertingPublisherContext>>;
  ebtService: jest.Mocked<EbtServiceContract>;
  mockLogger: jest.Mocked<Logger>;
} {
  const eventBus = createEventBusMock<AlertingDomainEvent, AlertingPublisherContext>();
  const { loggerService, mockLogger } = createLoggerService();
  const ebtService = createMockEbtService();

  return {
    publisher: new AlertActionEventPublisher(eventBus, loggerService, ebtService),
    eventBus,
    ebtService,
    mockLogger,
  };
}
