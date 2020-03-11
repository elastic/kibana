/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useCallback, useEffect, useReducer } from 'react';
import { DEFAULT_TABLE_ACTIVE_PAGE, DEFAULT_TABLE_LIMIT } from './constants';
import { AllCases, SortFieldCase, FilterOptions, QueryParams, Case } from './types';
import { errorToToaster, useStateToaster } from '../../components/toasters';
import * as i18n from './translations';
import { UpdateByKey } from './use_update_case';
import { getCases, patchCase } from './api';

export interface UseGetCasesState {
  data: AllCases;
  filterOptions: FilterOptions;
  isError: boolean;
  loading: string[];
  queryParams: QueryParams;
  selectedCases: Case[];
}

export interface UpdateCase extends UpdateByKey {
  caseId: string;
  version: string;
}

export type Action =
  | { type: 'FETCH_INIT'; payload: string }
  | {
      type: 'FETCH_CASES_SUCCESS';
      payload: AllCases;
    }
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
        isError: false,
        loading: [...state.loading.filter(e => e !== action.payload), action.payload],
      };
    case 'FETCH_UPDATE_CASE_SUCCESS':
      return {
        ...state,
        loading: state.loading.filter(e => e !== 'caseUpdate'),
      };
    case 'FETCH_CASES_SUCCESS':
      return {
        ...state,
        data: action.payload,
        isError: false,
        loading: state.loading.filter(e => e !== 'cases'),
      };
    case 'FETCH_FAILURE':
      return {
        ...state,
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
      return state;
  }
};

const initialData: AllCases = {
  cases: [],
  countClosedCases: null,
  countOpenCases: null,
  page: 0,
  perPage: 0,
  total: 0,
};
interface UseGetCases extends UseGetCasesState {
  dispatchUpdateCaseProperty: ({ updateKey, updateValue, caseId, version }: UpdateCase) => void;
  refetchCases: (filters: FilterOptions, queryParams: QueryParams) => void;
  setFilters: (filters: FilterOptions) => void;
  setQueryParams: (queryParams: QueryParams) => void;
  setSelectedCases: (mySelectedCases: Case[]) => void;
}
export const useGetCases = (): UseGetCases => {
  const [state, dispatch] = useReducer(dataFetchReducer, {
    data: initialData,
    filterOptions: {
      search: '',
      status: 'open',
      tags: [],
    },
    isError: false,
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

  const setSelectedCases = useCallback((mySelectedCases: Case[]) => {
    dispatch({ type: 'UPDATE_TABLE_SELECTIONS', payload: mySelectedCases });
  }, []);

  const setQueryParams = useCallback((newQueryParams: QueryParams) => {
    dispatch({ type: 'UPDATE_QUERY_PARAMS', payload: newQueryParams });
  }, []);

  const setFilters = useCallback((newFilters: FilterOptions) => {
    dispatch({ type: 'UPDATE_FILTER_OPTIONS', payload: newFilters });
  }, []);

  const fetchCases = useCallback((filterOptions: FilterOptions, queryParams: QueryParams) => {
    let didCancel = false;
    const fetchData = async () => {
      dispatch({ type: 'FETCH_INIT', payload: 'cases' });
      try {
        const response = await getCases({
          filterOptions,
          queryParams,
        });
        if (!didCancel) {
          dispatch({
            type: 'FETCH_CASES_SUCCESS',
            payload: response,
          });
        }
      } catch (error) {
        if (!didCancel) {
          errorToToaster({
            title: i18n.ERROR_TITLE,
            error: error.body && error.body.message ? new Error(error.body.message) : error,
            dispatchToaster,
          });
          dispatch({ type: 'FETCH_FAILURE', payload: 'cases' });
        }
      }
    };
    fetchData();
    return () => {
      didCancel = true;
    };
  }, []);

  useEffect(() => fetchCases(state.filterOptions, state.queryParams), [
    state.queryParams,
    state.filterOptions,
  ]);

  const dispatchUpdateCaseProperty = useCallback(
    ({ updateKey, updateValue, caseId, version }: UpdateCase) => {
      let didCancel = false;
      const fetchData = async () => {
        dispatch({ type: 'FETCH_INIT', payload: 'caseUpdate' });
        try {
          await patchCase(
            caseId,
            { [updateKey]: updateValue },
            version ?? '' // saved object versions are typed as string | undefined, hope that's not true
          );
          if (!didCancel) {
            dispatch({ type: 'FETCH_UPDATE_CASE_SUCCESS' });
            fetchCases(state.filterOptions, state.queryParams);
          }
        } catch (error) {
          if (!didCancel) {
            errorToToaster({ title: i18n.ERROR_TITLE, error, dispatchToaster });
            dispatch({ type: 'FETCH_FAILURE', payload: 'caseUpdate' });
          }
        }
      };
      fetchData();
      return () => {
        didCancel = true;
      };
    },
    [state.filterOptions, state.queryParams]
  );

  const refetchCases = useCallback(() => {
    fetchCases(state.filterOptions, state.queryParams);
  }, [state.filterOptions, state.queryParams]);

  return {
    ...state,
    dispatchUpdateCaseProperty,
    refetchCases,
    setFilters,
    setQueryParams,
    setSelectedCases,
  };
};
