/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import type { Filter } from '@kbn/es-query';

export interface ExportFilters {
  kuery?: string;
  activeFilters?: Filter[];
  /** Total result count under the currently applied filters (or all results when no filters are active). */
  filteredTotal?: number;
  /** Total result count regardless of any UI filters (i.e. what the unfiltered export would return). */
  total?: number;
}

interface ExportFiltersContextValue {
  getFilters: (actionId: string) => ExportFilters | undefined;
  setFilters: (actionId: string, filters: ExportFilters) => void;
}

const ExportFiltersContext = createContext<ExportFiltersContextValue | null>(null);

export const ExportFiltersProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [filtersMap, setFiltersMap] = useState<Map<string, ExportFilters>>(() => new Map());

  // Keep setFilters reference stable across re-renders so consumer effects
  // don't re-run on every state update (which would loop).
  const setFiltersRef = useRef<(actionId: string, filters: ExportFilters) => void>(() => undefined);
  setFiltersRef.current = (actionId: string, filters: ExportFilters) => {
    setFiltersMap((prev) => {
      const existing = prev.get(actionId);
      if (existing && shallowEqualFilters(existing, filters)) {
        return prev;
      }

      const next = new Map(prev);
      next.set(actionId, filters);

      return next;
    });
  };

  const setFilters = useCallback(
    (actionId: string, filters: ExportFilters) => setFiltersRef.current(actionId, filters),
    []
  );

  const getFilters = useCallback((actionId: string) => filtersMap.get(actionId), [filtersMap]);

  const value = useMemo(() => ({ getFilters, setFilters }), [getFilters, setFilters]);

  return <ExportFiltersContext.Provider value={value}>{children}</ExportFiltersContext.Provider>;
};

export const useExportFiltersContext = () => useContext(ExportFiltersContext);

const shallowEqualFilters = (a: ExportFilters, b: ExportFilters) =>
  a.kuery === b.kuery &&
  a.filteredTotal === b.filteredTotal &&
  a.total === b.total &&
  a.activeFilters === b.activeFilters;
