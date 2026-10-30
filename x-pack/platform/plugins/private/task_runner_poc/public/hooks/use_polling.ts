/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { errorMessage } from '../api';

export interface Polled<T> {
  data: T | undefined;
  error: string | undefined;
  /** Fetches right away and restarts the interval. */
  refresh: () => void;
}

/**
 * Calls `fetcher` now and then `intervalMs` after each call settles, so slow responses never
 * overlap. Keeps the last good data when a call fails.
 */
export const usePolling = <T>(fetcher: () => Promise<T>, intervalMs: number): Polled<T> => {
  const [data, setData] = useState<T>();
  const [error, setError] = useState<string>();
  const [generation, setGeneration] = useState(0);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const poll = async () => {
      try {
        const next = await fetcherRef.current();
        if (!cancelled) {
          setData(next);
          setError(undefined);
        }
      } catch (e) {
        if (!cancelled) {
          setError(errorMessage(e));
        }
      }
      if (!cancelled) {
        timer = setTimeout(poll, intervalMs);
      }
    };
    poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [intervalMs, generation]);

  const refresh = useCallback(() => setGeneration((value) => value + 1), []);
  return { data, error, refresh };
};
