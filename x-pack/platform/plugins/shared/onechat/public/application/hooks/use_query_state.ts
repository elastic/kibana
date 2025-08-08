/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { IKbnUrlStateStorage, createKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import { Primitive } from 'utility-types';

export interface UseQueryStateOptions<T> {
  defaultValue?: T;
  historyMode?: 'replace' | 'push';
}

export interface SetQueryStateOptions {
  historyMode?: 'replace' | 'push';
}

export type SetQueryState<T> = (
  nextValue: T | ((previousValue: T) => T),
  setOptions?: SetQueryStateOptions
) => Promise<void>;

export interface UseQueryState {
  <T>(key: string, options?: UseQueryStateOptions<T> & { defaultValue: undefined }): [
    T | null,
    SetQueryState<T | null>
  ];
  <T>(key: string, options?: UseQueryStateOptions<T>): [T, SetQueryState<T>];
}

/**
 * Synchronizes state with URL query parameters.
 * Similar to `useState` but persists state in the URL for deep linking and navigation.
 *
 * @param key - The query parameter key
 * @param options.defaultValue - Default value when no state exists in URL
 * @param options.historyMode - 'replace' or 'push' for URL updates (default: 'replace')
 * @returns [state, setState]
 */
export const useQueryState: UseQueryState = <T extends Primitive | object>(
  key: string,
  { defaultValue = null, historyMode = 'replace' } = {}
) => {
  const history = useHistory();
  const urlStateRef = useRef<IKbnUrlStateStorage>(
    createKbnUrlStateStorage({
      history,
      useHash: false,
      useHashQuery: false,
    })
  );

  const readFromUrl = useCallback(() => {
    return urlStateRef.current.get<T>(key);
  }, [key]);

  const [state, setState] = useState(readFromUrl() ?? defaultValue);

  const clearQueryParam = useCallback(() => {
    const searchParams = new URLSearchParams(history.location.search);
    searchParams.delete(key);
    history.replace({
      search: searchParams.toString(),
    });
  }, [history, key]);

  useEffect(() => {
    const subscription = urlStateRef.current.change$<T>(key).subscribe((value) => {
      setState(value ?? defaultValue);
    });
    return () => subscription.unsubscribe();
  }, [key, defaultValue]);

  const setQueryState = useCallback<SetQueryState<T | null>>(
    async (nextValue, setOptions) => {
      const resolvedValue =
        typeof nextValue === 'function' ? nextValue(readFromUrl() ?? defaultValue) : nextValue;
      setState(resolvedValue);

      await urlStateRef.current.set(key, resolvedValue, {
        replace: (setOptions?.historyMode ?? historyMode) !== 'push',
      });

      if (!resolvedValue) {
        clearQueryParam();
      }
    },
    [readFromUrl, clearQueryParam, defaultValue, historyMode, key]
  );

  return [state, setQueryState] as const;
};
