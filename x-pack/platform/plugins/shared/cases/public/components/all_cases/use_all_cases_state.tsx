/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef, useCallback, useMemo, useState } from 'react';
import { useLocation, useHistory } from 'react-router-dom';
import deepEqual from 'react-fast-compare';
import { isEmpty } from 'lodash';

import type { FilterOptions, QueryParams } from '../../../common/ui/types';
import {
  DEFAULT_CASES_TABLE_STATE,
  DEFAULT_FILTER_OPTIONS,
  DEFAULT_QUERY_PARAMS,
} from '../../containers/constants';
import { LOCAL_STORAGE_KEYS } from '../../../common/constants';
import type { AllCasesTableState, AllCasesURLState } from './types';
import { stringifyUrlParams } from './utils/stringify_url_params';
import { allCasesUrlStateDeserializer } from './utils/all_cases_url_state_deserializer';
import { allCasesUrlStateSerializer } from './utils/all_cases_url_state_serializer';
import { parseUrlParams } from './utils/parse_url_params';
import { sanitizeState } from './utils/sanitize_state';
import { useGetCaseConfiguration } from '../../containers/configure/use_get_case_configuration';
import { useCasesLocalStorage } from '../../common/use_cases_local_storage';

interface UseAllCasesStateReturn {
  filterOptions: FilterOptions;
  setQueryParams: (queryParam: Partial<QueryParams>) => void;
  setFilterOptions: (filterOptions: Partial<FilterOptions>) => void;
  queryParams: QueryParams;
}

export function useAllCasesState(isModalView: boolean = false): UseAllCasesStateReturn {
  const isStateLoadedFromLocalStorage = useRef(false);
  const isFirstRun = useRef(false);
  const [tableState, setTableState] = useState<AllCasesTableState>(DEFAULT_CASES_TABLE_STATE);
  const [urlState, setUrlState] = useAllCasesUrlState();
  const [localStorageState, setLocalStorageState] = useAllCasesLocalStorage();
  const { isFetching: isLoadingCasesConfiguration } = useGetCaseConfiguration();

  const allCasesTableState: AllCasesTableState = useMemo(
    () => (isModalView ? tableState : getAllCasesTableState(urlState, localStorageState)),
    [isModalView, tableState, urlState, localStorageState]
  );

  const setState = useCallback(
    (state: AllCasesTableState) => {
      if (isModalView) {
        setTableState(state);
        return;
      }

      if (!deepEqual(state, urlState)) {
        setUrlState(state);
      }

      if (!deepEqual(state, localStorageState)) {
        setLocalStorageState(state);
      }
    },
    [localStorageState, urlState, isModalView, setLocalStorageState, setUrlState]
  );

  // use of useEffect because setUrlState calls history.push
  useEffect(() => {
    if (
      !isStateLoadedFromLocalStorage.current &&
      isURLStateEmpty(urlState) &&
      localStorageState &&
      !isModalView
    ) {
      setUrlState(localStorageState, 'replace');
      isStateLoadedFromLocalStorage.current = true;
    }
  }, [localStorageState, setUrlState, urlState, isModalView]);

  /**
   * When navigating for the first time in a URL
   * we need to persist the state on the local storage.
   * We need to do it only on the first run and only when the URL is not empty.
   * Otherwise we may introduce a race condition or loop with the above hook.
   */
  if (
    !isFirstRun.current &&
    !isURLStateEmpty(urlState) &&
    localStorageState &&
    !deepEqual(allCasesTableState, localStorageState) &&
    !isLoadingCasesConfiguration &&
    !isModalView
  ) {
    setLocalStorageState(allCasesTableState);
    isFirstRun.current = true;
  }

  return {
    ...allCasesTableState,
    setQueryParams: (newQueryParams: Partial<QueryParams>) => {
      setState({
        filterOptions: allCasesTableState.filterOptions,
        queryParams: { ...allCasesTableState.queryParams, ...newQueryParams },
      });
    },
    setFilterOptions: (newFilterOptions: Partial<FilterOptions>) => {
      setState({
        filterOptions: { ...allCasesTableState.filterOptions, ...newFilterOptions },
        queryParams: allCasesTableState.queryParams,
      });
    },
  };
}

const useAllCasesUrlState = (): [
  AllCasesURLState,
  (updated: AllCasesTableState, mode?: 'push' | 'replace') => void
] => {
  const history = useHistory();
  const location = useLocation();
  const {
    data: { customFields: customFieldsConfiguration },
  } = useGetCaseConfiguration();

  const urlParams = parseUrlParams(new URLSearchParams(decodeURIComponent(location.search)));
  const parsedUrlParams = allCasesUrlStateDeserializer(urlParams, customFieldsConfiguration);

  const updateQueryParams = useCallback(
    (updated: AllCasesTableState, mode: 'push' | 'replace' = 'push') => {
      const updatedQuery = allCasesUrlStateSerializer(updated);
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

const getAllCasesTableState = (
  urlState: AllCasesURLState,
  localStorageState?: AllCasesTableState
): AllCasesTableState => {
  if (isURLStateEmpty(urlState)) {
    return {
      queryParams: { ...DEFAULT_CASES_TABLE_STATE.queryParams, ...localStorageState?.queryParams },
      filterOptions: {
        ...DEFAULT_CASES_TABLE_STATE.filterOptions,
        ...localStorageState?.filterOptions,
      },
    };
  }

  return {
    queryParams: { ...DEFAULT_CASES_TABLE_STATE.queryParams, ...urlState.queryParams },
    filterOptions: { ...DEFAULT_CASES_TABLE_STATE.filterOptions, ...urlState.filterOptions },
  };
};

const isURLStateEmpty = (urlState: AllCasesURLState) => {
  if (isEmpty(urlState)) {
    return true;
  }

  if (isEmpty(urlState.filterOptions) && isEmpty(urlState.queryParams)) {
    return true;
  }

  return false;
};

const useAllCasesLocalStorage = (): [
  AllCasesTableState | undefined,
  (item: AllCasesTableState | undefined) => void
] => {
  const [state, setState] = useCasesLocalStorage<AllCasesTableState | undefined>(
    LOCAL_STORAGE_KEYS.casesTableState,
    {
      queryParams: DEFAULT_QUERY_PARAMS,
      filterOptions: DEFAULT_FILTER_OPTIONS,
    }
  );

  const sanitizedState = sanitizeState(state);

  return [
    {
      queryParams: { ...DEFAULT_CASES_TABLE_STATE.queryParams, ...sanitizedState.queryParams },
      filterOptions: {
        ...DEFAULT_CASES_TABLE_STATE.filterOptions,
        ...sanitizedState.filterOptions,
      },
    },
    setState,
  ];
};
