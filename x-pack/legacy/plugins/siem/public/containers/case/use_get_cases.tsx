/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Dispatch, SetStateAction, useEffect, useReducer, useState } from 'react';

import {
  DEFAULT_TABLE_ACTIVE_PAGE,
  DEFAULT_TABLE_LIMIT,
  FETCH_FAILURE,
  FETCH_INIT,
  FETCH_SUCCESS,
  UPDATE_PAGINATION,
} from './constants';
import { FlattenedCasesSavedObjects, SortFieldCase, CasesState, QueryArgs, Action } from './types';
import { Direction } from '../../graphql/types';
import { errorToToaster } from '../../components/ml/api/error_to_toaster';
import { useStateToaster } from '../../components/toasters';
import * as i18n from './translations';
import { flattenSavedObjects } from './utils';
import { fetchCases } from './api';

const dataFetchReducer = (state: CasesState, action: Action): CasesState => {
  switch (action.type) {
    case FETCH_INIT:
      return {
        ...state,
        isLoading: true,
        isError: false,
      };
    case FETCH_SUCCESS:
      const getTypedPayload = (a: Action['payload']) => a as FlattenedCasesSavedObjects;
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
    case UPDATE_PAGINATION:
      return {
        ...state,
        pagination: {
          ...state.pagination,
          ...action.payload,
        },
      };
    default:
      throw new Error();
  }
};
const initialData: FlattenedCasesSavedObjects = {
  page: 0,
  per_page: 0,
  total: 0,
  saved_objects: [],
};
export const useGetCases = (): [CasesState, Dispatch<SetStateAction<QueryArgs>>] => {
  const [state, dispatch] = useReducer(dataFetchReducer, {
    isLoading: false,
    isError: false,
    data: initialData,
    filterOptions: {
      filter: '',
      sortField: 'enabled',
      sortOrder: 'desc',
    },
    pagination: {
      page: DEFAULT_TABLE_ACTIVE_PAGE,
      perPage: DEFAULT_TABLE_LIMIT,
      sortField: SortFieldCase.createdAt,
      sortOrder: Direction.desc,
    },
  });
  const [query, setQuery] = useState(state.pagination as QueryArgs);
  const [, dispatchToaster] = useStateToaster();

  useEffect(() => {
    dispatch({ type: UPDATE_PAGINATION, payload: query });
  }, [query]);

  useEffect(() => {
    let didCancel = false;
    const fetchData = async () => {
      dispatch({ type: FETCH_INIT });
      try {
        const response = await fetchCases({
          filterOptions: state.filterOptions,
          pagination: state.pagination,
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
  }, [state.pagination]);
  return [state, setQuery];
};
