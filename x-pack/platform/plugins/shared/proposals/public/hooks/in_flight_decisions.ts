/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useSyncExternalStore } from 'react';

export type DecisionKind = 'approve' | 'decline';

type Listener = () => void;

const counts = new Map<string, number>();
const unseen = new Map<string, DecisionKind>();
const listeners = new Set<Listener>();

const keyOf = (kind: DecisionKind, id: string): string => `${kind}:${id}`;

const notify = (): void => {
  listeners.forEach((listener) => listener());
};

/**
 * The decisions that run now in all `QueryClient`s.
 *
 * The chat page and the investigation flyout each have their own `QueryClient`, and
 * `useIsMutating` sees only its own client. This store lets the flyout show "Applying" for a
 * decision that the chat page started.
 *
 * A decision also counts after its request ends, until the data of the row shows it (the "unseen"
 * mark). The gate workflow writes the decision after the approve call returns, and the write time
 * is not known. A list read can also show data that is older than the write. So each row decides
 * from its own data, and a read of another row or source never ends the mark.
 */
export const inFlightDecisions = {
  start(kind: DecisionKind, id: string): void {
    const key = keyOf(kind, id);
    counts.set(key, (counts.get(key) ?? 0) + 1);
    unseen.delete(id);
    notify();
  },

  end(kind: DecisionKind, id: string): void {
    const key = keyOf(kind, id);
    const next = (counts.get(key) ?? 0) - 1;
    if (next > 0) {
      counts.set(key, next);
    } else {
      counts.delete(key);
    }
    notify();
  },

  has(kind: DecisionKind, id: string): boolean {
    return counts.has(keyOf(kind, id));
  },

  markUnseen(kind: DecisionKind, id: string): void {
    unseen.set(id, kind);
    notify();
  },

  clearUnseen(id: string): void {
    if (unseen.delete(id)) {
      notify();
    }
  },

  hasUnseen(id: string, kind?: DecisionKind): boolean {
    const unseenKind = unseen.get(id);
    return unseenKind !== undefined && (kind === undefined || unseenKind === kind);
  },

  /** Empties the store. For tests. */
  reset(): void {
    counts.clear();
    unseen.clear();
    notify();
  },

  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

/**
 * True while a decision of this kind runs for the proposal in any `QueryClient`, or while it is
 * unseen and the data of the row (`decisionShown`) does not show it yet.
 */
export const useIsDecisionInFlight = (
  kind: DecisionKind,
  id: string | undefined,
  decisionShown: boolean
): boolean => {
  // The snapshot is a boolean, so a row re-renders only when its own proposal changes.
  return useSyncExternalStore(
    inFlightDecisions.subscribe,
    () =>
      id !== undefined &&
      (inFlightDecisions.has(kind, id) || (!decisionShown && inFlightDecisions.hasUnseen(id, kind)))
  );
};
