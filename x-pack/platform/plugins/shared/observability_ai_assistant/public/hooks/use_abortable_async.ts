/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { isPromise } from '@kbn/std';
import { useEffect, useMemo, useRef, useState } from 'react';

interface State<T> {
  error?: Error;
  value?: T;
  loading: boolean;
}

export type AbortableAsyncState<T> = (T extends Promise<infer TReturn>
  ? State<TReturn>
  : State<T>) & { refresh: () => void };

export function useAbortableAsync<T>(
  fn: ({}: { signal: AbortSignal }) => T | Promise<T>,
  deps: any[],
  options?: { clearValueOnNext?: boolean; defaultValue?: () => T }
): AbortableAsyncState<T> {
  const clearValueOnNext = options?.clearValueOnNext;

  const controllerRef = useRef(new AbortController());

  const [refreshId, setRefreshId] = useState(0);

  const [error, setError] = useState<Error>();
  const [loading, setLoading] = useState(false);
  const [value, setValue] = useState<T | undefined>(options?.defaultValue);

  useEffect(() => {
    controllerRef.current.abort();

    const controller = new AbortController();
    controllerRef.current = controller;

    if (clearValueOnNext) {
      setValue(undefined);
      setError(undefined);
    }

    try {
      const response = fn({ signal: controller.signal });
      if (isPromise(response)) {
        setLoading(true);
        response
          .then((nextValue) => {
            setError(undefined);
            setValue(nextValue);
          })
          .catch((err) => {
            setValue(undefined);
            setError(err);
          })
          .finally(() => setLoading(false));
      } else {
        setError(undefined);
        setValue(response);
        setLoading(false);
      }
    } catch (err) {
      setValue(undefined);
      setError(err);
      setLoading(false);
    }

    return () => {
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps.concat(refreshId, clearValueOnNext));

  return useMemo<AbortableAsyncState<T>>(() => {
    return {
      error,
      loading,
      value,
      refresh: () => {
        setRefreshId((id) => id + 1);
      },
    } as unknown as AbortableAsyncState<T>;
  }, [error, value, loading]);
}
