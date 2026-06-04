/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useRef } from 'react';
import { isEqual } from 'lodash';

export interface UseDebouncedOnChangeEmitArgs<TOutput, TMeta> {
  getOutput: () => TOutput;
  initialOutput: TOutput;
  onChange: (next: TOutput, meta: TMeta) => void;
  buildMeta: () => TMeta;
  onChangeDebounceMs: number;
  emitSignal: unknown;
}

/**
 * Debounces `onChange` emissions and ensures a final scheduled emission is cleaned up on unmount.
 *
 * The hook is intentionally generic so ILM and DLM flyouts can each map their RHF values into their
 * own output shapes (e.g. `IlmPolicyPhases` vs `IngestStreamLifecycleDSL['dsl']`).
 */
export const useDebouncedOnChangeEmit = <TOutput, TMeta>({
  getOutput,
  initialOutput,
  onChange,
  buildMeta,
  onChangeDebounceMs,
  emitSignal,
}: UseDebouncedOnChangeEmitArgs<TOutput, TMeta>) => {
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const lastEmittedMetaRef = useRef<TMeta>(buildMeta());
  const lastEmittedOutputRef = useRef<TOutput>(initialOutput);

  const pendingOnChangeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingOnChangeEmitScheduledRef = useRef(false);
  const pendingOnChangeEmitScheduleIdRef = useRef(0);

  const scheduleOnChangeEmit = useCallback(() => {
    pendingOnChangeEmitScheduleIdRef.current += 1;
    const scheduledId = pendingOnChangeEmitScheduleIdRef.current;

    if (pendingOnChangeTimeoutRef.current) {
      clearTimeout(pendingOnChangeTimeoutRef.current);
      pendingOnChangeTimeoutRef.current = null;
    }

    pendingOnChangeEmitScheduledRef.current = true;

    const emit = () => {
      pendingOnChangeEmitScheduledRef.current = false;
      const toEmit = getOutput();
      const metaToEmit = buildMeta();

      if (
        isEqual(toEmit, lastEmittedOutputRef.current) &&
        isEqual(metaToEmit, lastEmittedMetaRef.current)
      ) {
        return;
      }

      lastEmittedOutputRef.current = toEmit;
      lastEmittedMetaRef.current = metaToEmit;
      onChangeRef.current(toEmit, metaToEmit);
    };

    const timeoutMs = onChangeDebounceMs === 0 ? 0 : onChangeDebounceMs;
    pendingOnChangeTimeoutRef.current = setTimeout(() => {
      pendingOnChangeTimeoutRef.current = null;
      if (pendingOnChangeEmitScheduleIdRef.current !== scheduledId) return;
      emit();
    }, timeoutMs);
  }, [buildMeta, getOutput, onChangeDebounceMs]);

  useEffect(() => {
    return () => {
      if (pendingOnChangeTimeoutRef.current) {
        clearTimeout(pendingOnChangeTimeoutRef.current);
        pendingOnChangeTimeoutRef.current = null;
      }
      pendingOnChangeEmitScheduledRef.current = false;
      pendingOnChangeEmitScheduleIdRef.current += 1;
    };
  }, []);

  useEffect(() => {
    scheduleOnChangeEmit();
  }, [emitSignal, scheduleOnChangeEmit]);

  useEffect(() => {
    // Re-emit meta when it changes without any form data change. If we already have a scheduled
    // emit (due to form changes), that emit will compute meta at emit-time.
    if (pendingOnChangeEmitScheduledRef.current) return;
    scheduleOnChangeEmit();
  }, [buildMeta, scheduleOnChangeEmit]);
};
