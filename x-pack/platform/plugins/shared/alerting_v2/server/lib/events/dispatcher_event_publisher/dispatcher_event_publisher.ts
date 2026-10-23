/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import {
  AlertingDomainEventBusToken,
  type AlertingDomainEvent,
  type AlertingPublisherContext,
} from '../domain_events';
import type { EventBus } from '../event_bus';
import {
  DISPATCHER_EXECUTION_COMPLETED_EVENT_TYPE,
  type DispatcherExecutionCompletedEvent,
  type DispatcherExecutionCompletedPayload,
} from './events';

/**
 * Public contract for the dispatcher event publisher.
 *
 * Called by {@link DispatcherPipeline} when a tick runs to completion.
 */
export interface DispatcherEventPublisherContract {
  publishExecutionCompleted(payload: DispatcherExecutionCompletedPayload): void;
}

/**
 * Publisher of dispatcher domain events on the alerting {@link EventBus}.
 *
 * The dispatcher task runs without a request, so events are published with the
 * `internal` origin and no `request` in the context.
 */
@injectable()
export class DispatcherEventPublisher implements DispatcherEventPublisherContract {
  constructor(
    @inject(AlertingDomainEventBusToken)
    private readonly eventBus: EventBus<AlertingDomainEvent, AlertingPublisherContext>
  ) {}

  public publishExecutionCompleted(payload: DispatcherExecutionCompletedPayload): void {
    const event: DispatcherExecutionCompletedEvent = {
      type: DISPATCHER_EXECUTION_COMPLETED_EVENT_TYPE,
      payload,
    };

    this.eventBus.publish(event, { origin: 'internal' });
  }
}
