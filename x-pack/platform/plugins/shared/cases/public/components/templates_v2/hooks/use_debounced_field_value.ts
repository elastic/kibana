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
  /** Wire to the input's focus event — while focused, the field owns its value. */
  onFocus: () => void;
  /** Wire to the input's blur event — flushes any pending change and hands ownership back. */
  onBlur: () => void;
}

/**
 * Holds a field value locally (so typing is instant) while debouncing the expensive propagation to
 * a parent — YAML re-serialization, local-storage writes, and the render-panel re-render. Without
 * this, every keystroke in the render panel does that work synchronously and the inputs feel laggy.
 *
 * While the field is focused it owns its value and ignores `external`. The parent round-trips the
 * value through YAML (serialize → parse → hand back down as a prop), so its echo lands one or more
 * renders after the keystroke that caused it. A field that adopts every `external` change will
 * therefore adopt the echo of an *earlier* keystroke while the user is still typing — rewriting the
 * input mid-word and throwing the caret to the end. That is the jitter, and ownership-while-focused
 * is the fix. Fields that commit on every keystroke (the required template name) hit it hardest,
 * because they start a fresh round-trip on every character.
 *
 * Outside changes — a direct YAML edit, a template load — are adopted whenever the field is not
 * focused, which covers every case where they can occur without competing with the user's own
 * typing. `flush` on blur commits the value before Save reads it.
 */
export const useDebouncedFieldValue = <T>(
  external: T,
  propagate: (next: T) => void,
  delayMs: number = DEFAULT_DELAY_MS
): DebouncedFieldValue<T> => {
  const [value, setValue] = useState<T>(external);
  const isFocusedRef = useRef(false);

  // Keep the latest `propagate` without re-creating the debounced fn (which would drop pending calls).
  const propagateRef = useRef(propagate);
  propagateRef.current = propagate;

  const debouncedRef = useRef(debounce((next: T) => propagateRef.current(next), delayMs));

  useEffect(() => {
    const debounced = debouncedRef.current;
    return () => debounced.cancel();
  }, []);

  // Adopt external changes that did not originate from this field, unless the user is currently
  // typing in it — see the note above on why an in-flight echo must not beat local input.
  useEffect(() => {
    if (isFocusedRef.current) {
      return;
    }
    setValue((current) => (isEqual(current, external) ? current : external));
  }, [external]);

  const set = useCallback((next: T) => {
    setValue(next);
    debouncedRef.current(next);
  }, []);

  const flush = useCallback(() => {
    debouncedRef.current.flush();
  }, []);

  const onFocus = useCallback(() => {
    isFocusedRef.current = true;
  }, []);

  const onBlur = useCallback(() => {
    isFocusedRef.current = false;
    debouncedRef.current.flush();
  }, []);

  return { value, setValue: set, flush, onFocus, onBlur };
};
