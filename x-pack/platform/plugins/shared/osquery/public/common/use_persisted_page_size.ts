/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import useLocalStorage from 'react-use/lib/useLocalStorage';
import { useCallback } from 'react';

const STORAGE_KEY = 'osquery:pageSize';

const PAGE_SIZE_OPTIONS_TUPLE = [10, 25, 50, 100] as const;
type PageSize = (typeof PAGE_SIZE_OPTIONS_TUPLE)[number];

export const PAGE_SIZE_OPTIONS: number[] = [...PAGE_SIZE_OPTIONS_TUPLE];
export const DEFAULT_PAGE_SIZE = 10;

const PAGE_SIZE_SET: ReadonlySet<number> = new Set(PAGE_SIZE_OPTIONS_TUPLE);

const isValidPageSize = (value: unknown): value is PageSize =>
  typeof value === 'number' && PAGE_SIZE_SET.has(value);

export const usePersistedPageSize = (): [number, (size: number) => void] => {
  const [storedValue, setStoredValue] = useLocalStorage<number>(STORAGE_KEY, DEFAULT_PAGE_SIZE);

  const pageSize = isValidPageSize(storedValue) ? storedValue : DEFAULT_PAGE_SIZE;

  const setPageSize = useCallback(
    (size: number) => {
      if (isValidPageSize(size)) {
        setStoredValue(size);
      }
    },
    [setStoredValue]
  );

  return [pageSize, setPageSize];
};
