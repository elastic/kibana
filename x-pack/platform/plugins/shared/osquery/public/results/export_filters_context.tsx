/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useCallback, useContext, useMemo, useRef } from 'react';
import type { Filter } from '@kbn/es-query';

export interface ExportFilters {
  kuery?: string;
  activeFilters?: Filter[];
  filteredTotal?: number;
}

interface ExportFiltersContextValue {
  getFilters: (actionId: string) => ExportFilters | undefined;
  setFilters: (actionId: string, filters: ExportFilters) => void;
}

const ExportFiltersContext = createContext<ExportFiltersContextValue | null>(null);

export const ExportFiltersProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const filtersRef = useRef<Map<string, ExportFilters>>(new Map());

  const getFilters = useCallback((actionId: string) => filtersRef.current.get(actionId), []);

  const setFilters = useCallback((actionId: string, filters: ExportFilters) => {
    filtersRef.current.set(actionId, filters);
  }, []);

  const value = useMemo(() => ({ getFilters, setFilters }), [getFilters, setFilters]);

  return (
    <ExportFiltersContext.Provider value={value}>{children}</ExportFiltersContext.Provider>
  );
};

export const useExportFiltersContext = () => useContext(ExportFiltersContext);
