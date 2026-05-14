/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useSyncExternalStore,
} from 'react';
import type { Filter } from '@kbn/es-query';

export interface ExportFilters {
  kuery?: string;
  activeFilters?: Filter[];
  /** Total result count under the currently applied filters (or all results when no filters are active). */
  filteredTotal?: number;
  /** Total result count regardless of any UI filters (i.e. what the unfiltered export would return). */
  total?: number;
}

type Listener = () => void;

export interface ExportFiltersStore {
  /** Imperative read of the latest filters for an actionId. */
  getFilters: (actionId: string) => ExportFilters | undefined;
  /** Write filters for an actionId; only notifies subscribers when shape changes. */
  setFilters: (actionId: string, filters: ExportFilters) => void;
  /**
   * Drop the entry for an actionId and notify subscribers. Used by the
   * publishing component's unmount cleanup so collapsed rows don't leave
   * stale filter state in the store.
   */
  clearFilters: (actionId: string) => void;
  /**
   * Subscribe to changes for a single actionId. Returns the unsubscribe fn.
   * Used by `useExportFilters(actionId)` via `useSyncExternalStore`.
   */
  subscribe: (actionId: string, listener: Listener) => () => void;
}

const ExportFiltersContext = createContext<ExportFiltersStore | null>(null);

/**
 * Ref-backed store with per-actionId subscriptions.
 *
 * Design intent (per spec): writing filters must NOT re-render the provider's
 * parent. Only consumers that explicitly subscribe to a given `actionId` via
 * `useExportFilters` re-render, and only when that actionId's filters change.
 */
export const ExportFiltersProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const filtersRef = useRef<Map<string, ExportFilters>>(new Map());
  const listenersRef = useRef<Map<string, Set<Listener>>>(new Map());

  const getFilters = useCallback((actionId: string) => filtersRef.current.get(actionId), []);

  const setFilters = useCallback((actionId: string, filters: ExportFilters) => {
    const existing = filtersRef.current.get(actionId);
    if (existing && shallowEqualFilters(existing, filters)) {
      return;
    }

    filtersRef.current.set(actionId, filters);

    const listeners = listenersRef.current.get(actionId);
    if (listeners) {
      listeners.forEach((listener) => listener());
    }
  }, []);

  const clearFilters = useCallback((actionId: string) => {
    if (!filtersRef.current.has(actionId)) return;
    filtersRef.current.delete(actionId);

    const listeners = listenersRef.current.get(actionId);
    if (listeners) {
      listeners.forEach((listener) => listener());
    }
  }, []);

  const subscribe = useCallback((actionId: string, listener: Listener) => {
    let listeners = listenersRef.current.get(actionId);
    if (!listeners) {
      listeners = new Set();
      listenersRef.current.set(actionId, listeners);
    }

    listeners.add(listener);

    return () => {
      const current = listenersRef.current.get(actionId);
      if (!current) return;
      current.delete(listener);
      if (current.size === 0) {
        listenersRef.current.delete(actionId);
      }
    };
  }, []);

  const store = useMemo<ExportFiltersStore>(
    () => ({ getFilters, setFilters, clearFilters, subscribe }),
    [getFilters, setFilters, clearFilters, subscribe]
  );

  return <ExportFiltersContext.Provider value={store}>{children}</ExportFiltersContext.Provider>;
};

export const useExportFiltersContext = () => useContext(ExportFiltersContext);

/**
 * Subscribes a component to filter updates for a single `actionId`. Returns
 * the latest snapshot and re-renders only when this specific entry changes.
 */
export const useExportFilters = (actionId: string | undefined): ExportFilters | undefined => {
  const store = useContext(ExportFiltersContext);

  const subscribe = useCallback(
    (listener: Listener) => {
      if (!store || !actionId) return () => undefined;

      return store.subscribe(actionId, listener);
    },
    [store, actionId]
  );

  const getSnapshot = useCallback(() => {
    if (!store || !actionId) return undefined;

    return store.getFilters(actionId);
  }, [store, actionId]);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
};

const shallowEqualFilters = (a: ExportFilters, b: ExportFilters) =>
  a.kuery === b.kuery &&
  a.filteredTotal === b.filteredTotal &&
  a.total === b.total &&
  a.activeFilters === b.activeFilters;
