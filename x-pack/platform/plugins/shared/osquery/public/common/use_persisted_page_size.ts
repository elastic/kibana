/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import useLocalStorage from 'react-use/lib/useLocalStorage';
import { useCallback } from 'react';

const STORAGE_KEY = 'osquery:pageSize';

export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;
export const DEFAULT_PAGE_SIZE = 10;

type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];

const isValidPageSize = (value: unknown): value is PageSize =>
  PAGE_SIZE_OPTIONS.includes(value as PageSize);

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
