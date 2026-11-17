/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LoggerServiceContract } from '../services/logger_service/logger_service';
import type { AlertingDomainEvent, AlertingPublisherContext } from './domain_events';
import type { EventBus, Subscription } from './event_bus';

/**
 * Base class for the alerting domain-event bus subscribers.
 *
 * It owns the identical lifecycle every subscriber shares — the idempotent
 * `start()` (guarding against a double subscribe), the bus subscriptions it
 * records, and the `stop()` that unsubscribes them all. Concrete subscribers
 * declare only which events they attach to and the dispatch logic, by
 * implementing {@link createSubscriptions}.
 */
export abstract class BaseEventBusSubscriber {
  #subscriptions: Subscription[] = [];

  protected constructor(
    private readonly bus: EventBus<AlertingDomainEvent, AlertingPublisherContext>,
    protected readonly logger: LoggerServiceContract
  ) {}

  /**
   * Subscribes this subscriber's handlers on `bus` and returns the resulting
   * subscriptions. Called once per `start()`. `bus.subscribe` narrows each
   * handler's `event` to the subscribed `type`, so no casts are needed.
   */
  protected abstract createSubscriptions(
    bus: EventBus<AlertingDomainEvent, AlertingPublisherContext>
  ): Subscription[];

  public start(): void {
    if (this.#subscriptions.length > 0) {
      this.logger.debug({
        message: () => 'Subscriber start called more than once; ignoring',
      });

      return;
    }

    this.#subscriptions = this.createSubscriptions(this.bus);
  }

  public stop(): void {
    for (const subscription of this.#subscriptions) {
      subscription.unsubscribe();
    }

    this.#subscriptions = [];
  }
}
