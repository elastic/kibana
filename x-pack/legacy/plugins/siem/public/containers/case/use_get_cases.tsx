/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Dispatch, SetStateAction, useEffect, useReducer, useState } from 'react';
import { isEqual } from 'lodash/fp';
import { DEFAULT_TABLE_ACTIVE_PAGE, DEFAULT_TABLE_LIMIT } from './constants';
import { AllCases, SortFieldCase, FilterOptions, QueryParams, Case } from './types';
import { errorToToaster } from '../../components/ml/api/error_to_toaster';
import { useStateToaster } from '../../components/toasters';
import * as i18n from './translations';
import { getCases } from './api';

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

interface CaseCount {
  open: number;
  closed: number;
}

export type Action =
  | { type: 'FETCH_INIT'; payload: 'cases' | 'caseCount' }
  | { type: 'FETCH_CASE_COUNT_SUCCESS'; payload: Partial<CaseCount> }
  | { type: 'FETCH_CASES_SUCCESS'; payload: AllCases }
  | { type: 'FETCH_FAILURE'; payload: 'cases' | 'caseCount' }
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
        loading: [...state.loading, action.payload],
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
  Dispatch<keyof CaseCount>
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

  useEffect(() => {
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
  return [state, setFilters, setQueryParams, setSelectedCases, getCaseCount];
};
