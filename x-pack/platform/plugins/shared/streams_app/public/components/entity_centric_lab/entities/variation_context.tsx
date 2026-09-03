/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * React context + provider that exposes a multi-dimensional variation
 * system backed by URL query params (`v_<dimensionId>=<optionId>`).
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
  type PropsWithChildren,
} from 'react';
import { useHistory, useLocation } from 'react-router-dom';

import {
  VARIATION_DIMENSIONS,
  type VariationDimension,
} from './variation_registry';

/** URL param prefix so variation keys don't collide with app params. */
const PARAM_PREFIX = 'v_';

// ---------------------------------------------------------------------------
// Context shape
// ---------------------------------------------------------------------------

interface VariationContextValue {
  /** Returns the active option id for the given dimension. */
  get: (dimensionId: string) => string;
  /** Replaces the active option for one dimension (updates the URL). */
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
  const location = useLocation();
  const history = useHistory();

  // Parse `v_*` params from the current URL on every render so the
  // context value stays in sync with browser back/forward.
  const selections = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const map: Record<string, string> = {};
    for (const dim of VARIATION_DIMENSIONS) {
      const raw = params.get(`${PARAM_PREFIX}${dim.id}`);
      if (raw && dim.options.some((opt) => opt.id === raw)) {
        map[dim.id] = raw;
      }
    }
    return map;
  }, [location.search]);

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
      const params = new URLSearchParams(location.search);
      const dim = VARIATION_DIMENSIONS.find((d) => d.id === dimensionId);
      if (!dim) return;
      // Only write the param when it differs from the default — keeps
      // the URL clean for the common "everything default" case.
      if (optionId === dim.defaultOption) {
        params.delete(`${PARAM_PREFIX}${dimensionId}`);
      } else {
        params.set(`${PARAM_PREFIX}${dimensionId}`, optionId);
      }
      const search = params.toString();
      history.replace({
        pathname: location.pathname,
        search: search ? `?${search}` : '',
      });
    },
    [history, location.pathname, location.search]
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
