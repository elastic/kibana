/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useCallback, useEffect, useReducer } from 'react';
import { DEFAULT_TABLE_ACTIVE_PAGE, DEFAULT_TABLE_LIMIT } from './constants';
import {
  AllCases,
  SortFieldCase,
  FilterOptions,
  Pagination,
  Case,
  Query,
  UpdateQuery,
} from './types';
import { errorToToaster, useStateToaster } from '../../components/toasters';
import * as i18n from './translations';
import { UpdateByKey } from './use_update_case';
import { getCases, patchCase } from './api';

export interface UseGetCasesState {
  data: AllCases;
  query: Query;
  isError: boolean;
  loading: string[];
  selectedCases: Case[];
}

export interface UpdateCase extends UpdateByKey {
  caseId: string;
  version: string;
  refetchCasesStatus: () => void;
}

export type Action =
  | { type: 'FETCH_INIT'; payload: string }
  | {
      type: 'FETCH_CASES_SUCCESS';
      payload: AllCases;
    }
  | { type: 'FETCH_FAILURE'; payload: string }
  | { type: 'FETCH_UPDATE_CASE_SUCCESS' }
  | { type: 'UPDATE_QUERY'; payload: UpdateQuery }
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
    case 'UPDATE_QUERY':
      const { filterOptions, pagination } = action.payload;
      const query = { ...state.query };

      if (filterOptions != null) {
        query.filterOptions = { ...query.filterOptions, ...filterOptions };
      }

      if (pagination != null) {
        query.pagination = { ...query.pagination, ...pagination };
      }

      return {
        ...state,
        query,
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

export const DEFAULT_FILTER_OPTIONS: FilterOptions = {
  search: '',
  reporters: [],
  status: 'open',
  tags: [],
  sortField: SortFieldCase.createdAt,
  sortOrder: 'desc',
};

export const DEFAULT_PAGINATION_PARAMS: Pagination = {
  page: DEFAULT_TABLE_ACTIVE_PAGE,
  perPage: DEFAULT_TABLE_LIMIT,
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
  dispatchUpdateCaseProperty: ({
    updateKey,
    updateValue,
    caseId,
    version,
    refetchCasesStatus,
  }: UpdateCase) => void;
  refetchCases: (query: Query) => void;
  updateQuery: (query: UpdateQuery) => void;
  setSelectedCases: (mySelectedCases: Case[]) => void;
}

export const useGetCases = (initialQueryParams?: Pagination): UseGetCases => {
  const [state, dispatch] = useReducer(dataFetchReducer, {
    data: initialData,
    query: {
      filterOptions: DEFAULT_FILTER_OPTIONS,
      pagination: initialQueryParams ?? DEFAULT_PAGINATION_PARAMS,
    },
    isError: false,
    loading: [],
    selectedCases: [],
  });

  const [, dispatchToaster] = useStateToaster();

  const setSelectedCases = useCallback((mySelectedCases: Case[]) => {
    dispatch({ type: 'UPDATE_TABLE_SELECTIONS', payload: mySelectedCases });
  }, []);

  const updateQuery = useCallback((query: UpdateQuery) => {
    dispatch({ type: 'UPDATE_QUERY', payload: query });
  }, []);

  const fetchCases = useCallback(({ filterOptions, pagination }: Query) => {
    let didCancel = false;
    const abortCtrl = new AbortController();

    const fetchData = async () => {
      dispatch({ type: 'FETCH_INIT', payload: 'cases' });
      try {
        const response = await getCases({
          filterOptions,
          pagination,
          signal: abortCtrl.signal,
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
      abortCtrl.abort();
      didCancel = true;
    };
  }, []);

  useEffect(() => fetchCases(state.query), [state.query]);

  const dispatchUpdateCaseProperty = useCallback(
    ({ updateKey, updateValue, caseId, refetchCasesStatus, version }: UpdateCase) => {
      let didCancel = false;
      const abortCtrl = new AbortController();

      const fetchData = async () => {
        dispatch({ type: 'FETCH_INIT', payload: 'caseUpdate' });
        try {
          await patchCase(
            caseId,
            { [updateKey]: updateValue },
            // saved object versions are typed as string | undefined, hope that's not true
            version ?? '',
            abortCtrl.signal
          );
          if (!didCancel) {
            dispatch({ type: 'FETCH_UPDATE_CASE_SUCCESS' });
            fetchCases(state.query);
            refetchCasesStatus();
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
        abortCtrl.abort();
        didCancel = true;
      };
    },
    [state.query]
  );

  const refetchCases = useCallback(() => {
    fetchCases(state.query);
  }, [state.query]);

  return {
    ...state,
    dispatchUpdateCaseProperty,
    refetchCases,
    updateQuery,
    setSelectedCases,
  };
};
