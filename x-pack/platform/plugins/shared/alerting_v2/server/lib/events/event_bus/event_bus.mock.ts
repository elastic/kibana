/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DomainEvent, EventBus } from './types';

/**
 * Builds a fully jest-mocked {@link EventBus} for tests whose unit under
 * test publishes (or subscribes) but whose behaviour does not depend on
 * the bus's own dispatch semantics.
 *
 * Use this in publisher / subscriber unit tests and assert on
 * `mock.publish` / `mock.subscribe`. The real bus has its own coverage in
 * `event_bus.test.ts`
 *
 * The generic parameter mirrors the bus's: pass the catalog union (e.g.
 * `AlertingDomainEvent`) to keep callers' `publish` arguments narrowed
 * the same way they are in production code.
 *
 * @example
 * ```ts
 * import { createEventBusMock } from '../../events/event_bus/event_bus.mock';
 * import type { AlertingDomainEvent } from '../../events/domain_events';
 *
 * const eventBus = createEventBusMock<AlertingDomainEvent>();
 * const service = new MyService(eventBus);
 *
 * service.doSomething();
 *
 * expect(eventBus.publish).toHaveBeenCalledWith({ type: 'episode.assigned', ... });
 * ```
 */
export function createEventBusMock<TEvent extends DomainEvent = DomainEvent>(): jest.Mocked<
  EventBus<TEvent>
> {
  return {
    publish: jest.fn(),
    subscribe: jest.fn().mockReturnValue({ unsubscribe: jest.fn() }),
  };
}
