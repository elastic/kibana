/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Dispatch, SetStateAction, useCallback, useEffect, useReducer, useState } from 'react';
import { isEqual } from 'lodash/fp';
import { DEFAULT_TABLE_ACTIVE_PAGE, DEFAULT_TABLE_LIMIT } from './constants';
import { AllCases, SortFieldCase, FilterOptions, QueryParams, Case } from './types';
import { errorToToaster } from '../../components/ml/api/error_to_toaster';
import { useStateToaster } from '../../components/toasters';
import * as i18n from './translations';
import { UpdateByKey } from './use_update_case';
import { getCases, updateCaseProperty } from './api';

export interface UseGetCasesState {
  caseCount: CaseCount;
  data: AllCases;
  filterOptions: FilterOptions;
  isError: boolean;
  isLoading: boolean;
  loading: string[];
  queryParams: QueryParams;
  selectedCases: Case[];
}

export interface CaseCount {
  open: number;
  closed: number;
}

interface UpdateCase extends UpdateByKey {
  caseId: string;
  version: string;
}

export type Action =
  | { type: 'FETCH_INIT'; payload: string }
  | { type: 'FETCH_CASE_COUNT_SUCCESS'; payload: Partial<CaseCount> }
  | { type: 'FETCH_CASES_SUCCESS'; payload: AllCases }
  | { type: 'FETCH_FAILURE'; payload: string }
  | { type: 'FETCH_UPDATE_CASE_SUCCESS' }
  | { type: 'UPDATE_FILTER_OPTIONS'; payload: FilterOptions }
  | { type: 'UPDATE_QUERY_PARAMS'; payload: Partial<QueryParams> }
  | { type: 'UPDATE_TABLE_SELECTIONS'; payload: Case[] };

const dataFetchReducer = (state: UseGetCasesState, action: Action): UseGetCasesState => {
  switch (action.type) {
    case 'FETCH_INIT':
      return {
        ...state,
        isLoading: true,
        isError: false,
        loading: [...state.loading.filter(e => e !== action.payload), action.payload],
      };
    case 'FETCH_UPDATE_CASE_SUCCESS':
      return {
        ...state,
        loading: state.loading.filter(e => e !== 'caseUpdate'),
      };
    case 'FETCH_CASE_COUNT_SUCCESS':
      return {
        ...state,
        caseCount: {
          ...state.caseCount,
          ...action.payload,
        },
        loading: state.loading.filter(e => e !== 'caseCount'),
      };
    case 'FETCH_CASES_SUCCESS':
      return {
        ...state,
        isLoading: false,
        isError: false,
        data: action.payload,
        loading: state.loading.filter(e => e !== 'cases'),
      };
    case 'FETCH_FAILURE':
      return {
        ...state,
        isLoading: false,
        isError: true,
        loading: state.loading.filter(e => e !== action.payload),
      };
    case 'UPDATE_FILTER_OPTIONS':
      return {
        ...state,
        filterOptions: action.payload,
      };
    case 'UPDATE_QUERY_PARAMS':
      return {
        ...state,
        queryParams: {
          ...state.queryParams,
          ...action.payload,
        },
      };
    case 'UPDATE_TABLE_SELECTIONS':
      return {
        ...state,
        selectedCases: action.payload,
      };
    default:
      throw new Error();
  }
};

const initialData: AllCases = {
  cases: [],
  page: 0,
  perPage: 0,
  total: 0,
};
export const useGetCases = (): [
  UseGetCasesState,
  Dispatch<SetStateAction<FilterOptions>>,
  Dispatch<SetStateAction<Partial<QueryParams>>>,
  Dispatch<SetStateAction<Case[]>>,
  Dispatch<keyof CaseCount>,
  Dispatch<UpdateCase>
] => {
  const [state, dispatch] = useReducer(dataFetchReducer, {
    caseCount: {
      open: 0,
      closed: 0,
    },
    data: initialData,
    filterOptions: {
      search: '',
      state: 'open',
      tags: [],
    },
    isError: false,
    isLoading: false,
    loading: [],
    queryParams: {
      page: DEFAULT_TABLE_ACTIVE_PAGE,
      perPage: DEFAULT_TABLE_LIMIT,
      sortField: SortFieldCase.createdAt,
      sortOrder: 'desc',
    },
    selectedCases: [],
  });
  const [, dispatchToaster] = useStateToaster();
  const [filterQuery, setFilters] = useState<FilterOptions>(state.filterOptions);
  const [queryParams, setQueryParams] = useState<Partial<QueryParams>>(state.queryParams);
  const [selectedCases, setSelectedCases] = useState<Case[]>(state.selectedCases);
  const [doUpdate, setDoUpdate] = useState(false);

  useEffect(() => {
    dispatch({ type: 'UPDATE_TABLE_SELECTIONS', payload: selectedCases });
  }, [selectedCases]);

  useEffect(() => {
    if (!isEqual(queryParams, state.queryParams)) {
      dispatch({ type: 'UPDATE_QUERY_PARAMS', payload: queryParams });
    }
  }, [queryParams, state.queryParams]);

  useEffect(() => {
    if (!isEqual(filterQuery, state.filterOptions)) {
      dispatch({ type: 'UPDATE_FILTER_OPTIONS', payload: filterQuery });
    }
  }, [filterQuery, state.filterOptions]);

  const fetchCases = useCallback(() => {
    let didCancel = false;
    const fetchData = async () => {
      dispatch({ type: 'FETCH_INIT', payload: 'cases' });
      try {
        const response = await getCases({
          filterOptions: state.filterOptions,
          queryParams: state.queryParams,
        });
        if (!didCancel) {
          dispatch({
            type: 'FETCH_CASES_SUCCESS',
            payload: response,
          });
        }
      } catch (error) {
        if (!didCancel) {
          errorToToaster({ title: i18n.ERROR_TITLE, error, dispatchToaster });
          dispatch({ type: 'FETCH_FAILURE', payload: 'cases' });
        }
      }
    };
    fetchData();
    return () => {
      didCancel = true;
    };
  }, [state.queryParams, state.filterOptions]);
  useEffect(() => fetchCases(), [state.queryParams, state.filterOptions]);
  useEffect(() => {
    if (doUpdate) {
      fetchCases();
      getCaseCount('open');
      getCaseCount('closed');
      setDoUpdate(false);
    }
  }, [doUpdate]);

  const getCaseCount = async (caseState: keyof CaseCount) => {
    dispatch({ type: 'FETCH_INIT', payload: 'caseCount' });
    try {
      const response = await getCases({
        filterOptions: { search: '', state: caseState, tags: [] },
      });
      dispatch({ type: 'FETCH_CASE_COUNT_SUCCESS', payload: { [caseState]: response.total } });
    } catch (error) {
      errorToToaster({ title: i18n.ERROR_TITLE, error, dispatchToaster });
      dispatch({ type: 'FETCH_FAILURE', payload: 'caseCount' });
    }
  };

  const dispatchUpdateCaseProperty = async ({
    updateKey,
    updateValue,
    caseId,
    version,
  }: UpdateCase) => {
    dispatch({ type: 'FETCH_INIT', payload: 'caseUpdate' });
    try {
      await updateCaseProperty(
        caseId,
        { [updateKey]: updateValue },
        version ?? '' // saved object versions are typed as string | undefined, hope that's not true
      );
      setDoUpdate(true);
      dispatch({ type: 'FETCH_UPDATE_CASE_SUCCESS' });
    } catch (error) {
      errorToToaster({ title: i18n.ERROR_TITLE, error, dispatchToaster });
      dispatch({ type: 'FETCH_FAILURE', payload: 'caseUpdate' });
    }
  };
  return [
    state,
    setFilters,
    setQueryParams,
    setSelectedCases,
    getCaseCount,
    dispatchUpdateCaseProperty,
  ];
};
