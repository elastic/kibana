/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import type { EventBus } from '../event_bus';
import { createEventBusMock } from '../event_bus/event_bus.mock';
import type { AlertingDomainEvent, AlertingPublisherContext } from '../domain_events';
import {
  RuleExecutorEventPublisher,
  type RuleExecutorEventPublisherContract,
} from './rule_executor_event_publisher';

export function createRuleExecutorEventPublisher(): {
  publisher: RuleExecutorEventPublisher;
  eventBus: jest.Mocked<EventBus<AlertingDomainEvent, AlertingPublisherContext>>;
  request: KibanaRequest;
} {
  const eventBus = createEventBusMock<AlertingDomainEvent, AlertingPublisherContext>();
  const request = httpServerMock.createKibanaRequest();

  return {
    publisher: new RuleExecutorEventPublisher(eventBus, request),
    eventBus,
    request,
  };
}

export const createMockRuleExecutorEventPublisher =
  (): jest.Mocked<RuleExecutorEventPublisherContract> => ({
    publishExecutionCompleted: jest.fn(),
  });
