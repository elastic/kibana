/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Dispatch, SetStateAction, useEffect, useReducer, useState } from 'react';

import chrome from 'ui/chrome';
import {
  DEFAULT_TABLE_ACTIVE_PAGE,
  DEFAULT_TABLE_LIMIT,
  FETCH_FAILURE,
  FETCH_INIT,
  FETCH_SUCCESS,
  UPDATE_TABLE,
} from './constants';
import { CasesSavedObjects, Direction, SortFieldCase } from './types';

interface TableArgs {
  page: number;
  perPage: number;
  sortField: SortFieldCase;
  sortOrder: Direction;
}

interface QueryArgs {
  page?: number;
  perPage?: number;
  sortField?: SortFieldCase;
  sortOrder?: Direction;
}

interface CasesState {
  data: CasesSavedObjects;
  isLoading: boolean;
  isError: boolean;
  table: TableArgs;
}
interface PayloadObj {
  [key: string]: unknown;
}
interface Action {
  type: string;
  payload?: CasesSavedObjects | QueryArgs | PayloadObj;
}

const dataFetchReducer = (state: CasesState, action: Action): CasesState => {
  switch (action.type) {
    case FETCH_INIT:
      return {
        ...state,
        isLoading: true,
        isError: false,
      };
    case FETCH_SUCCESS:
      const getSavedObject = (a: Action['payload']) => a as CasesSavedObjects;
      return {
        ...state,
        isLoading: false,
        isError: false,
        data: getSavedObject(action.payload),
      };
    case FETCH_FAILURE:
      return {
        ...state,
        isLoading: false,
        isError: true,
      };
    case UPDATE_TABLE:
      return {
        ...state,
        table: {
          ...state.table,
          ...action.payload,
        },
      };
    default:
      throw new Error();
  }
};
const initialData: CasesSavedObjects = {
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
    table: {
      page: DEFAULT_TABLE_ACTIVE_PAGE + 1,
      perPage: DEFAULT_TABLE_LIMIT,
      sortField: SortFieldCase.createdAt,
      sortOrder: Direction.desc,
    },
  });
  const [query, setQuery] = useState(state.table as QueryArgs);

  useEffect(() => {
    dispatch({ type: UPDATE_TABLE, payload: query });
  }, [query]);

  useEffect(() => {
    let didCancel = false;
    const fetchData = async () => {
      dispatch({ type: FETCH_INIT });
      try {
        const queryParams = Object.entries(state.table).reduce(
          (acc, [key, value]) => `${acc}${key}=${value}&`,
          '?'
        );
        const result = await fetch(`${chrome.getBasePath()}/api/cases${queryParams}`, {
          method: 'GET',
          credentials: 'same-origin',
          headers: {
            'content-type': 'application/json',
            'kbn-system-api': 'true',
            'kbn-xsrf': 'true',
          },
        });
        if (!didCancel) {
          const resultJson = await result.json();
          if (resultJson.statusCode >= 400) {
            dispatch({ type: FETCH_FAILURE });
          } else {
            dispatch({ type: FETCH_SUCCESS, payload: resultJson });
          }
        }
      } catch (error) {
        if (!didCancel) {
          dispatch({ type: FETCH_FAILURE });
        }
      }
    };
    fetchData();
    return () => {
      didCancel = true;
    };
  }, [state.table]);
  return [state, setQuery];
};
