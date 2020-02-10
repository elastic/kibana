/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Dispatch, SetStateAction, useEffect, useReducer, useRef, useState } from 'react';

import {
  DEFAULT_TABLE_ACTIVE_PAGE,
  DEFAULT_TABLE_LIMIT,
  FETCH_FAILURE,
  FETCH_INIT,
  FETCH_SUCCESS,
  UPDATE_QUERY_PARAMS,
  UPDATE_FILTER_OPTIONS,
} from './constants';
import {
  FlattenedCasesSavedObjects,
  SortFieldCase,
  UseGetCasesState,
  QueryArgs,
  Action,
  FilterOptions,
} from './types';
import { Direction } from '../../graphql/types';
import { errorToToaster } from '../../components/ml/api/error_to_toaster';
import { useStateToaster } from '../../components/toasters';
import * as i18n from './translations';
import { flattenSavedObjects } from './utils';
import { getCases } from './api';

const dataFetchReducer = (state: UseGetCasesState, action: Action): UseGetCasesState => {
  let getTypedPayload;
  switch (action.type) {
    case FETCH_INIT:
      return {
        ...state,
        isLoading: true,
        isError: false,
      };
    case FETCH_SUCCESS:
      getTypedPayload = (a: Action['payload']) => a as FlattenedCasesSavedObjects;
      return {
        ...state,
        isLoading: false,
        isError: false,
        data: getTypedPayload(action.payload),
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
      getTypedPayload = (a: Action['payload']) => a as FilterOptions;
      return {
        ...state,
        filterOptions: getTypedPayload(action.payload),
      };
    default:
      throw new Error();
  }
};

function useDidUpdateEffect(fn: () => void, inputs: unknown[]) {
  const didUpdateRef = useRef(false);

  useEffect(() => {
    if (didUpdateRef.current) fn();
    else didUpdateRef.current = true;
  }, inputs);
}

const initialData: FlattenedCasesSavedObjects = {
  page: 0,
  per_page: 0,
  total: 0,
  saved_objects: [],
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
  const [query, setQuery] = useState(state.queryParams as QueryArgs);
  const [filterQuery, setFilters] = useState(state.filterOptions as FilterOptions);
  const [, dispatchToaster] = useStateToaster();

  useDidUpdateEffect(() => {
    dispatch({ type: UPDATE_QUERY_PARAMS, payload: query });
  }, [query]);

  useDidUpdateEffect(() => {
    dispatch({ type: UPDATE_FILTER_OPTIONS, payload: filterQuery });
  }, [filterQuery]);

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
            payload: {
              ...response,
              saved_objects: flattenSavedObjects(response.saved_objects),
            },
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
  return [state, setQuery, setFilters];
};
