/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Dispatch, SetStateAction, useEffect, useReducer, useState } from 'react';
import { isEqual } from 'lodash/fp';
import {
  DEFAULT_TABLE_ACTIVE_PAGE,
  DEFAULT_TABLE_LIMIT,
  FETCH_FAILURE,
  FETCH_INIT,
  FETCH_SUCCESS,
  UPDATE_QUERY_PARAMS,
  UPDATE_FILTER_OPTIONS,
} from './constants';
import { AllCases, SortFieldCase, FilterOptions, QueryParams } from './types';
import { getTypedPayload } from './utils';
import { Direction } from '../../graphql/types';
import { errorToToaster } from '../../components/ml/api/error_to_toaster';
import { useStateToaster } from '../../components/toasters';
import * as i18n from './translations';
import { getCases } from './api';

export interface UseGetCasesState {
  data: AllCases;
  isLoading: boolean;
  isError: boolean;
  queryParams: QueryParams;
  filterOptions: FilterOptions;
}

export interface QueryArgs {
  page?: number;
  perPage?: number;
  sortField?: SortFieldCase;
  sortOrder?: Direction;
}

export interface Action {
  type: string;
  payload?: AllCases | QueryArgs | FilterOptions;
}
const dataFetchReducer = (state: UseGetCasesState, action: Action): UseGetCasesState => {
  switch (action.type) {
    case FETCH_INIT:
      return {
        ...state,
        isLoading: true,
        isError: false,
      };
    case FETCH_SUCCESS:
      return {
        ...state,
        isLoading: false,
        isError: false,
        data: getTypedPayload<AllCases>(action.payload),
      };
    case FETCH_FAILURE:
      return {
        ...state,
        isLoading: false,
        isError: true,
      };
    case UPDATE_QUERY_PARAMS:
      return {
        ...state,
        queryParams: {
          ...state.queryParams,
          ...action.payload,
        },
      };
    case UPDATE_FILTER_OPTIONS:
      return {
        ...state,
        filterOptions: getTypedPayload<FilterOptions>(action.payload),
      };
    default:
      throw new Error();
  }
};

const initialData: AllCases = {
  page: 0,
  per_page: 0,
  total: 0,
  cases: [],
};
export const useGetCases = (): [
  UseGetCasesState,
  Dispatch<SetStateAction<QueryArgs>>,
  Dispatch<SetStateAction<FilterOptions>>
] => {
  const [state, dispatch] = useReducer(dataFetchReducer, {
    isLoading: false,
    isError: false,
    data: initialData,
    filterOptions: {
      search: '',
      tags: [],
    },
    queryParams: {
      page: DEFAULT_TABLE_ACTIVE_PAGE,
      perPage: DEFAULT_TABLE_LIMIT,
      sortField: SortFieldCase.createdAt,
      sortOrder: Direction.desc,
    },
  });
  const [queryParams, setQueryParams] = useState(state.queryParams as QueryArgs);
  const [filterQuery, setFilters] = useState(state.filterOptions as FilterOptions);
  const [, dispatchToaster] = useStateToaster();

  useEffect(() => {
    if (!isEqual(queryParams, state.queryParams)) {
      dispatch({ type: UPDATE_QUERY_PARAMS, payload: queryParams });
    }
  }, [queryParams, state.queryParams]);

  useEffect(() => {
    if (!isEqual(filterQuery, state.filterOptions)) {
      dispatch({ type: UPDATE_FILTER_OPTIONS, payload: filterQuery });
    }
  }, [filterQuery, state.filterOptions]);

  useEffect(() => {
    let didCancel = false;
    const fetchData = async () => {
      dispatch({ type: FETCH_INIT });
      try {
        const response = await getCases({
          filterOptions: state.filterOptions,
          queryParams: state.queryParams,
        });
        if (!didCancel) {
          dispatch({
            type: FETCH_SUCCESS,
            payload: response,
          });
        }
      } catch (error) {
        if (!didCancel) {
          errorToToaster({ title: i18n.ERROR_TITLE, error, dispatchToaster });
          dispatch({ type: FETCH_FAILURE });
        }
      }
    };
    fetchData();
    return () => {
      didCancel = true;
    };
  }, [state.queryParams, state.filterOptions]);
  return [state, setQueryParams, setFilters];
};
