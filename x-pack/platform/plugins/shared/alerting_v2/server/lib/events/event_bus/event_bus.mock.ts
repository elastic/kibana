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
 * `event_bus.test.ts`.
 *
 * The generic parameters mirror the bus's: pass the catalog union (e.g.
 * `AlertingDomainEvent`) for `TEvent`, and the catalog's publisher
 * context (e.g. `AlertingPublisherContext`) for `TContext`, so callers'
 * `publish` / `subscribe` arguments are narrowed the same way they are
 * in production code.
 */
export function createEventBusMock<
  TEvent extends DomainEvent = DomainEvent,
  TContext = void
>(): jest.Mocked<EventBus<TEvent, TContext>> {
  return {
    publish: jest.fn(),
    subscribe: jest.fn().mockReturnValue({ unsubscribe: jest.fn() }),
  };
}
