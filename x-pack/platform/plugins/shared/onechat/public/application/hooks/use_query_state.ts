/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useHistory } from 'react-router-dom';
import type { IKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import { createKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import type { Primitive } from 'utility-types';

export interface UseQueryStateOptions<T> {
  defaultValue?: T;
  historyMode?: 'replace' | 'push';
  parse?: (value: T | null) => T;
}

export interface SetQueryStateOptions {
  historyMode?: 'replace' | 'push';
}

export type SetQueryState<T> = (nextValue: T, setOptions?: SetQueryStateOptions) => Promise<void>;

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
 * @param options.parse - Function to parse the value from the URL
 * @returns [state, setState]
 */
export const useQueryState: UseQueryState = <T extends NonNullable<Primitive> | object>(
  key: string,
  { defaultValue, historyMode = 'replace', parse }: UseQueryStateOptions<T> = {}
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
    const value = urlStateRef.current.get<T>(key);
    return (parse ? parse(value) : value) ?? defaultValue ?? null;
  }, [key, parse, defaultValue]);

  const [state, setState] = useState(() => readFromUrl());

  const clearQueryParam = useCallback(() => {
    const searchParams = new URLSearchParams(history.location.search);
    searchParams.delete(key);
    history.replace({
      search: searchParams.toString(),
    });
  }, [history, key]);

  useEffect(() => {
    if (!state) {
      clearQueryParam();
    }
  }, [state, clearQueryParam]);

  const setQueryState = useCallback<SetQueryState<T | null>>(
    async (nextValue, setOptions) => {
      setState(nextValue);

      if (nextValue) {
        await urlStateRef.current.set(key, nextValue, {
          replace: (setOptions?.historyMode ?? historyMode) !== 'push',
        });
      }
    },
    [historyMode, key]
  );

  return [state, setQueryState] as const;
};
