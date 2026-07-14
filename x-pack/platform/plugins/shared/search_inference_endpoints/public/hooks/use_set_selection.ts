/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo, useState } from 'react';

export interface UseSetSelectionResult {
  selected: Set<string>;
  seed: (keys: Set<string>) => void;
  toggle: (key: string) => void;
  selectAll: () => void;
  isDirty: boolean;
  total: number;
  totalSelected: number;
  allSelected: boolean;
}

export const useSetSelection = (allKeys: string[]): UseSetSelectionResult => {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [initial, setInitial] = useState<Set<string>>(new Set());

  const allSelected = allKeys.length > 0 && selected.size === allKeys.length;

  /**
   * Seeds both `selected` and the initial snapshot in one call.
   * Call this once after async data has loaded.
   */
  const seed = useCallback((keys: Set<string>) => {
    const snapshot = new Set(keys);
    setSelected(snapshot);
    setInitial(new Set(snapshot));
  }, []);

  const toggle = useCallback((key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelected(allSelected ? new Set() : new Set(allKeys));
  }, [allSelected, allKeys]);

  const isDirty = useMemo(
    () => selected.size !== initial.size || [...selected].some((k) => !initial.has(k)),
    [selected, initial]
  );

  return {
    selected,
    seed,
    toggle,
    selectAll,
    isDirty,
    total: allKeys.length,
    totalSelected: selected.size,
    allSelected,
  };
};
