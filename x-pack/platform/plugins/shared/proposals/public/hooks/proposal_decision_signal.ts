/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Cross-boundary signal for proposal decisions.
 *
 * Hosts that embed these hooks (the investigation flyout, the queue page) each mount their
 * own `QueryClient` — see `application.tsx` and `plugin.ts`'s lazy providers in the AlertZero
 * plugin — so a decision's own `invalidateQueries` only ever reaches the tree it ran in. This
 * module-level store is a pure signal: `bump()` increments a version counter and notifies every
 * subscriber regardless of which `QueryClient` it lives under; each subscriber (see
 * `useProposalDecisionSignal`) reacts by invalidating its own.
 *
 * No proposal data is stored here — the store is stateless with respect to proposal content.
 */

type Listener = () => void;

let _version = 0;
const _listeners = new Set<Listener>();

export const proposalDecisionSignal = {
  /** Notify every subscriber, wherever their own QueryClient lives. */
  bump(): void {
    _version += 1;
    _listeners.forEach((fn) => fn());
  },

  /**
   * Subscribe to store changes.
   * Pass this to `useSyncExternalStore` as the first argument.
   */
  subscribe(listener: Listener): () => void {
    _listeners.add(listener);
    return () => _listeners.delete(listener);
  },

  /**
   * Pass this to `useSyncExternalStore` as the second argument.
   */
  getSnapshot(): number {
    return _version;
  },
};
