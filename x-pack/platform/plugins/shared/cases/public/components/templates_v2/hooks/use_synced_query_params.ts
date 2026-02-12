/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * This hook syncs query params between URL and localStorage.
 * A similar solution exists in `all_cases/use_all_cases_state.tsx`.
 * Consider refactoring to a shared generic hook in the future.
 */

import { useEffect, useRef, useCallback, useMemo } from 'react';
import { useLocation, useHistory } from 'react-router-dom';
import deepEqual from 'react-fast-compare';
import { isEmpty } from 'lodash';

import { LOCAL_STORAGE_KEYS } from '../../../../common/constants';
import { useCasesLocalStorage } from '../../../common/use_cases_local_storage';
import type { TemplatesFindRequest } from '../../../../common/types/api/template/v1';
import type { TemplatesURLQueryParams } from '../types';
import { DEFAULT_QUERY_PARAMS } from '../constants';
import { stringifyUrlParams } from '../utils/stringify_url_params';
import { parseUrlParams } from '../utils/parse_url_params';
import { templatesUrlStateSerializer } from '../utils/url_state_serializer';
import { templatesUrlStateDeserializer } from '../utils/url_state_deserializer';
import { sanitizeState } from '../utils/sanitize_state';

interface UseSyncedQueryParamsReturn {
  queryParams: TemplatesFindRequest;
  setQueryParams: (params: Partial<TemplatesFindRequest>) => void;
}

export const useSyncedQueryParams = (): UseSyncedQueryParamsReturn => {
  const isStateLoadedFromLocalStorage = useRef(false);
  const isFirstRun = useRef(false);

  const [urlState, setUrlState] = useTemplatesUrlState();
  const [localStorageState, setLocalStorageState] = useTemplatesLocalStorage();

  const queryParams: TemplatesFindRequest = useMemo(
    () => getQueryParams(urlState, localStorageState),
    [urlState, localStorageState]
  );

  const setQueryParams = useCallback(
    (newParams: Partial<TemplatesFindRequest>) => {
      const newState = { ...queryParams, ...newParams };

      if (!deepEqual(newState, urlState)) {
        setUrlState(newState);
      }

      if (!deepEqual(newState, localStorageState)) {
        setLocalStorageState(newState);
      }
    },
    [queryParams, localStorageState, urlState, setLocalStorageState, setUrlState]
  );

  // Load state from localStorage if URL is empty
  useEffect(() => {
    if (!isStateLoadedFromLocalStorage.current && isURLStateEmpty(urlState) && localStorageState) {
      setUrlState(localStorageState, 'replace');
      isStateLoadedFromLocalStorage.current = true;
    }
  }, [localStorageState, setUrlState, urlState]);

  // Persist to localStorage when navigating for the first time
  if (
    !isFirstRun.current &&
    !isURLStateEmpty(urlState) &&
    localStorageState &&
    !deepEqual(queryParams, localStorageState)
  ) {
    setLocalStorageState(queryParams);
    isFirstRun.current = true;
  }

  return {
    queryParams,
    setQueryParams,
  };
};

const useTemplatesUrlState = (): [
  TemplatesURLQueryParams,
  (updated: TemplatesFindRequest, mode?: 'push' | 'replace') => void
] => {
  const history = useHistory();
  const location = useLocation();

  const urlParams = parseUrlParams(new URLSearchParams(decodeURIComponent(location.search)));
  const parsedUrlParams = templatesUrlStateDeserializer(urlParams);

  const updateQueryParams = useCallback(
    (updated: TemplatesFindRequest, mode: 'push' | 'replace' = 'push') => {
      const updatedQuery = templatesUrlStateSerializer(updated);
      const search = stringifyUrlParams(updatedQuery, location.search);

      history[mode]({
        ...location,
        search,
      });
    },
    [history, location]
  );

  return [parsedUrlParams, updateQueryParams];
};

const getQueryParams = (
  urlState: TemplatesURLQueryParams,
  localStorageState?: TemplatesFindRequest
): TemplatesFindRequest => {
  if (isURLStateEmpty(urlState)) {
    return {
      ...DEFAULT_QUERY_PARAMS,
      ...localStorageState,
    };
  }

  return {
    ...DEFAULT_QUERY_PARAMS,
    ...urlState,
  };
};

const isURLStateEmpty = (urlState: TemplatesURLQueryParams) => {
  return isEmpty(urlState);
};

const useTemplatesLocalStorage = (): [
  TemplatesFindRequest | undefined,
  (item: TemplatesFindRequest | undefined) => void
] => {
  const [state, setState] = useCasesLocalStorage<TemplatesFindRequest | undefined>(
    LOCAL_STORAGE_KEYS.templatesTableState,
    DEFAULT_QUERY_PARAMS
  );

  const sanitizedState = sanitizeState(state);

  return [
    {
      ...DEFAULT_QUERY_PARAMS,
      ...sanitizedState,
    },
    setState,
  ];
};
