/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EventEmitterAsyncResource } from 'node:events';
import type { Logger } from '@kbn/core/server';
import type {
  DomainEvent,
  EventBus,
  EventBusContextRest,
  EventBusHandlerArgs,
  Subscription,
} from './types';

const ASYNC_RESOURCE_NAME = 'AsyncDomainEventBus';

/**
 * Event names that have special semantics on Node's EventEmitter and
 * therefore cannot be used as domain-event `type` discriminators.
 */
const RESERVED_EVENT_TYPES: ReadonlySet<string> = new Set([
  'error',
  'newListener',
  'removeListener',
]);

/**
 * In-process pub/sub bus for domain events.
 *
 * Backed by `EventEmitterAsyncResource` with `captureRejections` enabled.
 * `publish` dispatches handlers on the next event-loop iteration via
 * `setImmediate`. Each handler is wrapped in its own try/catch; failures
 * are logged and never propagate to other handlers or the publisher.
 *
 * `TContext` (default `void`) travels from `publish` to every subscribed
 * handler unchanged. Use it to thread a `KibanaRequest` (or similar) from
 * the rule task into workflow subscribers without coupling the bus to it.
 */
export class AsyncDomainEventBus<TEvent extends DomainEvent = DomainEvent, TContext = void>
  implements EventBus<TEvent, TContext>
{
  readonly #emitter = new EventEmitterAsyncResource({
    captureRejections: true,
    name: ASYNC_RESOURCE_NAME,
  });

  constructor(private readonly logger: Logger) {
    this.#emitter.on('error', (err: unknown) =>
      this.logger.error(`[event_bus] Emitter error: ${err}`)
    );
  }

  public publish<E extends TEvent>(event: E, ...rest: EventBusContextRest<TContext>): void {
    if (!event || typeof event.type !== 'string') {
      this.logger.debug('[event_bus] Refused to publish event without a string type discriminator');
      return;
    }

    if (RESERVED_EVENT_TYPES.has(event.type)) {
      this.logger.warn(`[event_bus] Refused to publish event with reserved type: ${event.type}`);
      return;
    }

    if (rest.length > 0) {
      this.#emitter.emit(event.type, event, rest[0]);
    } else {
      this.#emitter.emit(event.type, event);
    }
  }

  public subscribe<E extends TEvent>(
    type: E['type'],
    handler: (...args: EventBusHandlerArgs<E, TContext>) => Promise<void> | void
  ): Subscription {
    const wrapped = (...args: EventBusHandlerArgs<E, TContext>): void => {
      setImmediate(async () => {
        try {
          await handler(...args);
        } catch (err) {
          this.logger.error(
            `[event_bus] Handler for "${type}" threw: ${err instanceof Error ? err.message : String(err)}`
          );
        }
      });
    };

    this.#emitter.on(type, wrapped);

    let active = true;
    return {
      unsubscribe: () => {
        if (!active) return;
        active = false;
        this.#emitter.off(type, wrapped);
      },
    };
  }
}
