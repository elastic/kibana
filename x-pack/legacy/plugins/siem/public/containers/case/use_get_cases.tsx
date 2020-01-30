/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Dispatch, SetStateAction, useEffect, useReducer, useState } from 'react';
import chrome from 'ui/chrome';

import { throwIfNotOk } from '../../hooks/api/api';
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
        const queryParams = Object.entries(state.pagination).reduce(
          (acc, [key, value]) => `${acc}${key}=${value}&`,
          '?'
        );
        const response = await fetch(`${chrome.getBasePath()}/api/cases${queryParams}`, {
          method: 'GET',
          credentials: 'same-origin',
          headers: {
            'content-type': 'application/json',
            'kbn-system-api': 'true',
            'kbn-xsrf': 'true',
          },
        });
        if (!didCancel) {
          await throwIfNotOk(response);
          const responseJson = await response.json();
          dispatch({
            type: FETCH_SUCCESS,
            payload: {
              ...responseJson,
              saved_objects: flattenSavedObjects(responseJson.saved_objects),
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
