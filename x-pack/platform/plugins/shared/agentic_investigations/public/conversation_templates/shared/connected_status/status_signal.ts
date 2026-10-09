/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Cross-boundary signal for triggering React Query invalidation after status mutations.
 *
 * The flyout's status toggle runs inside an isolated QueryClient (see `makeLazyWithProviders`),
 * so cache invalidation cannot cross that boundary directly. This module-level counter acts
 * as a pure signal: calling `bump()` increments the version and notifies every subscriber.
 * Subscribers (queue pages) watch the snapshot via `useSyncExternalStore` and react by
 * invalidating their own React Query cache.
 *
 * No status data is stored here — the store is intentionally stateless.
 */

type Listener = () => void;

let _version = 0;
const _listeners = new Set<Listener>();

export const statusSignal = {
  bump(): void {
    _version++;
    _listeners.forEach((fn) => fn());
  },
  subscribe(listener: Listener): () => void {
    _listeners.add(listener);
    return () => _listeners.delete(listener);
  },
  getSnapshot(): number {
    return _version;
  },
};
