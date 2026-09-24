/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Dispatch, SetStateAction } from 'react';
import { useCallback, useMemo, useState } from 'react';
import type { Filter } from '@kbn/es-query';
import type { AlertingV2ScopeAttributes, ScopedQueryAttributes } from '../../../common';

export type UseMaintenanceWindowScopeInitial = ScopedQueryAttributes | AlertingV2ScopeAttributes;

export interface UseMaintenanceWindowScopeResult {
  enabled: boolean;
  kql: string;
  filters: Filter[];
  errors: string[];
  setErrors: Dispatch<SetStateAction<string[]>>;
  onToggle: (isEnabled: boolean) => void;
  onKqlChange: (newKql: string) => void;
  onFiltersChange: Dispatch<SetStateAction<Filter[]>>;
}

const clearErrors = (current: string[]): string[] => (current.length === 0 ? current : []);

/**
 * Local enabled/kql/filters/errors state for one maintenance window scope (`undefined` unselected, `null` selected with no filter).
 */
export const useMaintenanceWindowScope = (
  initial?: UseMaintenanceWindowScopeInitial | null
): UseMaintenanceWindowScopeResult => {
  const [enabled, setEnabled] = useState(initial !== undefined);
  const [kql, setKql] = useState(initial?.kql || '');
  const [filters, setFilters] = useState<Filter[]>(() => {
    if (initial && 'filters' in initial && initial.filters) {
      return initial.filters as Filter[];
    }
    return [];
  });
  const [errors, setErrors] = useState<string[]>([]);

  const onToggle = useCallback((isEnabled: boolean) => {
    setEnabled(isEnabled);
    setErrors(clearErrors);
  }, []);

  const onKqlChange = useCallback((newKql: string) => {
    setKql(newKql);
    setErrors(clearErrors);
  }, []);

  return useMemo(
    () => ({
      enabled,
      kql,
      filters,
      errors,
      setErrors,
      onToggle,
      onKqlChange,
      onFiltersChange: setFilters,
    }),
    [enabled, kql, filters, errors, onToggle, onKqlChange]
  );
};
