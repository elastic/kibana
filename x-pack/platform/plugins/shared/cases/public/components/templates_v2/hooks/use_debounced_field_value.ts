/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { debounce, isEqual } from 'lodash';
import { useCallback, useEffect, useRef, useState } from 'react';

const DEFAULT_DELAY_MS = 250;

export interface DebouncedFieldValue<T> {
  value: T;
  setValue: (next: T) => void;
  /** Applies any pending change immediately (call on blur so Save always sees the latest value). */
  flush: () => void;
}

/**
 * Holds a field value locally (so typing is instant) while debouncing the expensive propagation to
 * a parent — YAML re-serialization, local-storage writes, and the render-panel re-render. Without
 * this, every keystroke in the render panel does that work synchronously and the inputs feel laggy.
 *
 * Re-syncs from `external` (value-compared) when it changes from outside the field — e.g. a direct
 * YAML edit or a template load. Call `flush` on blur so the value is committed before Save reads it.
 */
export const useDebouncedFieldValue = <T>(
  external: T,
  propagate: (next: T) => void,
  delayMs: number = DEFAULT_DELAY_MS
): DebouncedFieldValue<T> => {
  const [value, setValue] = useState<T>(external);
  const lastExternalRef = useRef<T>(external);

  // Keep the latest `propagate` without re-creating the debounced fn (which would drop pending calls).
  const propagateRef = useRef(propagate);
  propagateRef.current = propagate;

  const debouncedRef = useRef(debounce((next: T) => propagateRef.current(next), delayMs));

  useEffect(() => {
    const debounced = debouncedRef.current;
    return () => debounced.cancel();
  }, []);

  // Adopt external changes that did not originate from this field.
  useEffect(() => {
    if (!isEqual(lastExternalRef.current, external)) {
      lastExternalRef.current = external;
      setValue(external);
    }
  }, [external]);

  const set = useCallback((next: T) => {
    setValue(next);
    debouncedRef.current(next);
  }, []);

  const flush = useCallback(() => {
    debouncedRef.current.flush();
  }, []);

  return { value, setValue: set, flush };
};
