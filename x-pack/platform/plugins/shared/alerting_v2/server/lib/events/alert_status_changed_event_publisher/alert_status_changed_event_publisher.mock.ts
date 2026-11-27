/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { AlertStatusChangedOptIns } from '../../alert_status_changed';
import { createLoggerService } from '../../services/logger_service/logger_service.mock';
import type { EventBus } from '../event_bus';
import { createEventBusMock } from '../event_bus/event_bus.mock';
import type { AlertingDomainEvent, AlertingPublisherContext } from '../domain_events';
import {
  AlertStatusChangedEventPublisher,
  type AlertStatusChangedEventPublisherContract,
} from './alert_status_changed_event_publisher';

export function createAlertStatusChangedEventPublisher(): {
  publisher: AlertStatusChangedEventPublisher;
  eventBus: jest.Mocked<EventBus<AlertingDomainEvent, AlertingPublisherContext>>;
  optIns: AlertStatusChangedOptIns;
  request: KibanaRequest;
} {
  const eventBus = createEventBusMock<AlertingDomainEvent, AlertingPublisherContext>();
  const optIns = new AlertStatusChangedOptIns(createLoggerService().loggerService);
  const request = httpServerMock.createKibanaRequest();

  return {
    publisher: new AlertStatusChangedEventPublisher(eventBus, request, 'user', optIns),
    eventBus,
    optIns,
    request,
  };
}

export const createMockAlertStatusChangedEventPublisher =
  (): jest.Mocked<AlertStatusChangedEventPublisherContract> => ({
    publishAlertStatusChanges: jest.fn().mockResolvedValue(undefined),
  });
