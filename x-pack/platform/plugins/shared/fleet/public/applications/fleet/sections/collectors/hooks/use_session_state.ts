/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import useSessionStorage from 'react-use/lib/useSessionStorage';

import { FLEET_PAGE_SIZE_OPTIONS } from '../../../../../constants';

const STORAGE_KEY = 'fleet.collectorsListState';
const DEFAULT_PAGE_SIZE = FLEET_PAGE_SIZE_OPTIONS[0];

interface CollectorsSessionState {
  pageSize: number;
}

export const useCollectorsSessionState = () => {
  const [state, setState] = useSessionStorage<CollectorsSessionState>(STORAGE_KEY, {
    pageSize: DEFAULT_PAGE_SIZE,
  });

  const pageSize = state?.pageSize ?? DEFAULT_PAGE_SIZE;

  const setPageSize = useCallback(
    (size: number) => {
      if (size !== pageSize) {
        setState({ ...state, pageSize: size });
      }
    },
    [state, setState, pageSize]
  );

  return { pageSize, setPageSize };
};
