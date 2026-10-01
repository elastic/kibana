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

import { GROUP_BY_STORAGE_KEY } from './storage_keys';
import {
  VARIATION_DIMENSIONS,
  resolveVariationDefaultOption,
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

const writeToStorage = (
  dimensionId: string,
  optionId: string,
  selections: Readonly<Record<string, string>>
): void => {
  try {
    const dim = VARIATION_DIMENSIONS.find((d) => d.id === dimensionId);
    if (!dim) return;
    const effectiveDefault = resolveVariationDefaultOption(dimensionId, {
      ...selections,
      ...(dimensionId === 'phase' ? { phase: optionId } : {}),
    });
    if (optionId === effectiveDefault) {
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
  /** Whether the dimension is at its effective default (ignores stored override). */
  isAtDefault: (dimensionId: string) => boolean;
  /** Full dimension registry (used by the switcher UI). */
  dimensions: readonly VariationDimension[];
}

const defaultGet = (dimensionId: string): string =>
  resolveVariationDefaultOption(dimensionId, {});

const VariationContext = createContext<VariationContextValue>({
  get: defaultGet,
  set: () => {},
  isAtDefault: () => true,
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
      return resolveVariationDefaultOption(dimensionId, selections);
    },
    [selections]
  );

  const set = useCallback(
    (dimensionId: string, optionId: string) => {
      setSelections((prev) => {
        const next = { ...prev };
        const effectiveDefault = resolveVariationDefaultOption(dimensionId, {
          ...prev,
          ...(dimensionId === 'phase' ? { phase: optionId } : {}),
        });
        if (optionId === effectiveDefault) {
          delete next[dimensionId];
        } else {
          next[dimensionId] = optionId;
        }
        writeToStorage(dimensionId, optionId, prev);
        // When the phase changes, clear persisted state that is
        // phase-specific so the UI re-defaults cleanly:
        //   - bucket metric selections (Alerts vs Health default)
        //   - group-by (phase1 has 'alerts' field, phase3 has 'health')
        //   - dashboard style (Phase 1 → list + flyout preview)
        if (dimensionId === 'phase') {
          try {
            localStorage.removeItem('entityCentricLab.bucketMetricSelection.v4');
            localStorage.removeItem(GROUP_BY_STORAGE_KEY);
            localStorage.removeItem(`${STORAGE_PREFIX}dashboardStyle`);
          } catch {
            // ignore
          }
          delete next.dashboardStyle;
        }
        return next;
      });
    },
    []
  );

  const isAtDefault = useCallback(
    (dimensionId: string): boolean => {
      const explicit = selections[dimensionId];
      if (!explicit) {
        return true;
      }
      return explicit === resolveVariationDefaultOption(dimensionId, selections);
    },
    [selections]
  );

  const value = useMemo<VariationContextValue>(
    () => ({ get, set, isAtDefault, dimensions: VARIATION_DIMENSIONS }),
    [get, set, isAtDefault]
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
