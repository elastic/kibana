/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EventBus } from '../event_bus';
import { createEventBusMock } from '../event_bus/event_bus.mock';
import type { AlertingDomainEvent, AlertingPublisherContext } from '../domain_events';
import { ActionPolicyEventPublisher } from './action_policy_event_publisher';

/**
 * Builds a real {@link ActionPolicyEventPublisher} wired to a jest-mocked
 * {@link EventBus}.
 */
export function createActionPolicyEventPublisher(): {
  publisher: ActionPolicyEventPublisher;
  eventBus: jest.Mocked<EventBus<AlertingDomainEvent, AlertingPublisherContext>>;
} {
  const eventBus = createEventBusMock<AlertingDomainEvent, AlertingPublisherContext>();

  return {
    publisher: new ActionPolicyEventPublisher(eventBus),
    eventBus,
  };
}
