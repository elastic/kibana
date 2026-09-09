/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * React context + provider that exposes a multi-dimensional variation
 * system backed by `localStorage`. Each dimension is stored under the
 * key `elasticOn_v_<dimensionId>`. The value persists across all
 * navigations and page reloads.
 *
 * Consumers read the active option for any dimension via
 * {@link useVariation} and the switcher popover writes back via the
 * `set` method on the context value.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';

import {
  VARIATION_DIMENSIONS,
  type VariationDimension,
} from './variation_registry';

/** localStorage key prefix so variation keys don't collide with other state. */
const STORAGE_PREFIX = 'elasticOn_v_';

// ---------------------------------------------------------------------------
// localStorage helpers
// ---------------------------------------------------------------------------

const readFromStorage = (): Record<string, string> => {
  const map: Record<string, string> = {};
  try {
    for (const dim of VARIATION_DIMENSIONS) {
      const raw = localStorage.getItem(`${STORAGE_PREFIX}${dim.id}`);
      if (raw && dim.options.some((opt) => opt.id === raw)) {
        map[dim.id] = raw;
      }
    }
  } catch {
    // localStorage unavailable (private browsing, etc.) — fall back to defaults
  }
  return map;
};

const writeToStorage = (dimensionId: string, optionId: string): void => {
  try {
    const dim = VARIATION_DIMENSIONS.find((d) => d.id === dimensionId);
    if (!dim) return;
    if (optionId === dim.defaultOption) {
      localStorage.removeItem(`${STORAGE_PREFIX}${dimensionId}`);
    } else {
      localStorage.setItem(`${STORAGE_PREFIX}${dimensionId}`, optionId);
    }
  } catch {
    // ignore
  }
};

// ---------------------------------------------------------------------------
// Context shape
// ---------------------------------------------------------------------------

interface VariationContextValue {
  /** Returns the active option id for the given dimension. */
  get: (dimensionId: string) => string;
  /** Replaces the active option for one dimension (persists to localStorage). */
  set: (dimensionId: string, optionId: string) => void;
  /** Full dimension registry (used by the switcher UI). */
  dimensions: readonly VariationDimension[];
}

const defaultGet = (dimensionId: string): string => {
  const dim = VARIATION_DIMENSIONS.find((d) => d.id === dimensionId);
  return dim?.defaultOption ?? '';
};

const VariationContext = createContext<VariationContextValue>({
  get: defaultGet,
  set: () => {},
  dimensions: VARIATION_DIMENSIONS,
});

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export const VariationProvider = ({ children }: PropsWithChildren<{}>) => {
  // Initialise from localStorage once on mount, then keep in React state
  // so writes trigger re-renders instantly.
  const [selections, setSelections] = useState<Record<string, string>>(readFromStorage);

  const get = useCallback(
    (dimensionId: string): string => {
      if (selections[dimensionId]) return selections[dimensionId];
      const dim = VARIATION_DIMENSIONS.find((d) => d.id === dimensionId);
      return dim?.defaultOption ?? '';
    },
    [selections]
  );

  const set = useCallback(
    (dimensionId: string, optionId: string) => {
      writeToStorage(dimensionId, optionId);
      // When the phase changes, clear persisted bucket metric selections
      // so the hex map re-defaults to the phase-appropriate metric
      // (e.g. Alerts for Phase 1, Health for Phase 3).
      if (dimensionId === 'phase') {
        try {
          localStorage.removeItem('entityCentricLab.bucketMetricSelection.v4');
        } catch {
          // ignore
        }
      }
      setSelections((prev) => {
        const next = { ...prev };
        const dim = VARIATION_DIMENSIONS.find((d) => d.id === dimensionId);
        if (dim && optionId === dim.defaultOption) {
          delete next[dimensionId];
        } else {
          next[dimensionId] = optionId;
        }
        return next;
      });
    },
    []
  );

  const value = useMemo<VariationContextValue>(
    () => ({ get, set, dimensions: VARIATION_DIMENSIONS }),
    [get, set]
  );

  return (
    <VariationContext.Provider value={value}>{children}</VariationContext.Provider>
  );
};

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/** Read the active option id for a single dimension. */
export const useVariation = (dimensionId: string): string => {
  const ctx = useContext(VariationContext);
  return ctx.get(dimensionId);
};

/** Full context value (used by the switcher popover). */
export const useVariationContext = (): VariationContextValue =>
  useContext(VariationContext);
