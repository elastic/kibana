/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EventBus } from '../event_bus';
import { createEventBusMock } from '../event_bus/event_bus.mock';
import type { AlertingDomainEvent, AlertingPublisherContext } from '../domain_events';
import {
  DispatcherEventPublisher,
  type DispatcherEventPublisherContract,
} from './dispatcher_event_publisher';

export function createDispatcherEventPublisher(): {
  publisher: DispatcherEventPublisher;
  eventBus: jest.Mocked<EventBus<AlertingDomainEvent, AlertingPublisherContext>>;
} {
  const eventBus = createEventBusMock<AlertingDomainEvent, AlertingPublisherContext>();

  return { publisher: new DispatcherEventPublisher(eventBus), eventBus };
}

export const createMockDispatcherEventPublisher =
  (): jest.Mocked<DispatcherEventPublisherContract> => ({
    publishExecutionCompleted: jest.fn(),
  });
