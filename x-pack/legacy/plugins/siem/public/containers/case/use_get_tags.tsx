/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect, useReducer } from 'react';
import { useStateToaster } from '../../components/toasters';
import { errorToToaster } from '../../components/ml/api/error_to_toaster';

import { getTags } from './api';
import { FETCH_FAILURE, FETCH_INIT, FETCH_SUCCESS } from './constants';
import * as i18n from './translations';

interface TagsState {
  data: string[];
  isLoading: boolean;
  isError: boolean;
}
interface Action {
  type: string;
  payload?: string[];
}

const dataFetchReducer = (state: TagsState, action: Action): TagsState => {
  switch (action.type) {
    case FETCH_INIT:
      return {
        ...state,
        isLoading: true,
        isError: false,
      };
    case FETCH_SUCCESS:
      const getTypedPayload = (a: Action['payload']) => a as string[];
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
    default:
      throw new Error();
  }
};
const initialData: string[] = [];

export const useGetTags = (): [TagsState] => {
  const [state, dispatch] = useReducer(dataFetchReducer, {
    isLoading: false,
    isError: false,
    data: initialData,
  });
  const [, dispatchToaster] = useStateToaster();

  useEffect(() => {
    let didCancel = false;
    const fetchData = async () => {
      dispatch({ type: FETCH_INIT });
      try {
        const response = await getTags();
        if (!didCancel) {
          dispatch({ type: FETCH_SUCCESS, payload: response });
        }
      } catch (error) {
        if (!didCancel) {
          errorToToaster({
            title: i18n.ERROR_TITLE,
            error: error.body && error.body.message ? new Error(error.body.message) : error,
            dispatchToaster,
          });
          dispatch({ type: FETCH_FAILURE });
        }
      }
    };
    fetchData();
    return () => {
      didCancel = true;
    };
  }, []);
  return [state];
};
