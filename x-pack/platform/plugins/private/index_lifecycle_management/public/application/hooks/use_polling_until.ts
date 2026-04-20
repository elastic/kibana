/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef, useState } from 'react';

interface UsePollingUntilParams<T> {
  enabled: boolean;
  pollIntervalMs?: number;
  maxAttempts?: number;
  onPoll: () => Promise<T | undefined>;
  shouldStop: (value: T) => boolean;
  onUpdate?: (value: T) => void;
}

type PollingStatus = 'disabled' | 'polling' | 'stopped' | 'exhausted';

export function usePollingUntil<T>({
  enabled,
  pollIntervalMs = 1000,
  maxAttempts = 6,
  onPoll,
  shouldStop,
  onUpdate,
}: UsePollingUntilParams<T>): PollingStatus {
  const attemptsRef = useRef(0);
  const [status, setStatus] = useState<PollingStatus>(enabled ? 'polling' : 'disabled');

  useEffect(() => {
    if (!enabled) {
      setStatus('disabled');
      return;
    }

    attemptsRef.current = 0;
    if (maxAttempts <= 0) {
      setStatus('exhausted');
      return;
    }
    setStatus('polling');
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let isMounted = true;

    const scheduleNext = () => {
      timeoutId = setTimeout(runPoll, pollIntervalMs);
    };

    const runPoll = async () => {
      attemptsRef.current += 1;

      try {
        const value = await onPoll();
        if (!isMounted) return;

        if (value !== undefined) {
          onUpdate?.(value);
          if (shouldStop(value)) {
            setStatus('stopped');
            return;
          }
        }
      } catch {
        if (!isMounted) return;
        // ignore and retry until attempts are exhausted
      }

      if (attemptsRef.current >= maxAttempts) {
        setStatus('exhausted');
        return;
      }

      scheduleNext();
    };

    // poll immediately, then schedule future polls as needed
    runPoll();

    return () => {
      isMounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [enabled, maxAttempts, onPoll, onUpdate, pollIntervalMs, shouldStop]);

  return status;
}
