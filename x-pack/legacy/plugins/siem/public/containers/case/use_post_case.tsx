/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useReducer, useCallback } from 'react';

import { CaseRequest } from '../../../../../../plugins/case/common/api';
import { errorToToaster, useStateToaster } from '../../components/toasters';
import { postCase } from './api';
import * as i18n from './translations';
import { Case } from './types';

interface NewCaseState {
  caseData: Case | null;
  isLoading: boolean;
  isError: boolean;
}
type Action =
  | { type: 'FETCH_INIT' }
  | { type: 'FETCH_SUCCESS'; payload: Case }
  | { type: 'FETCH_FAILURE' };

const dataFetchReducer = (state: NewCaseState, action: Action): NewCaseState => {
  switch (action.type) {
    case 'FETCH_INIT':
      return {
        ...state,
        isLoading: true,
        isError: false,
      };
    case 'FETCH_SUCCESS':
      return {
        ...state,
        isLoading: false,
        isError: false,
        caseData: action.payload ?? null,
      };
    case 'FETCH_FAILURE':
      return {
        ...state,
        isLoading: false,
        isError: true,
      };
    default:
      return state;
  }
};

interface UsePostCase extends NewCaseState {
  postCase: (data: CaseRequest) => void;
}
export const usePostCase = (): UsePostCase => {
  const [state, dispatch] = useReducer(dataFetchReducer, {
    isLoading: false,
    isError: false,
    caseData: null,
  });
  const [, dispatchToaster] = useStateToaster();

  const postMyCase = useCallback(async (data: CaseRequest) => {
    let cancel = false;
    try {
      dispatch({ type: 'FETCH_INIT' });
      const response = await postCase({ ...data, status: 'open' });
      if (!cancel) {
        dispatch({
          type: 'FETCH_SUCCESS',
          payload: response,
        });
      }
    } catch (error) {
      if (!cancel) {
        errorToToaster({
          title: i18n.ERROR_TITLE,
          error: error.body && error.body.message ? new Error(error.body.message) : error,
          dispatchToaster,
        });
        dispatch({ type: 'FETCH_FAILURE' });
      }
    }
    return () => {
      cancel = true;
    };
  }, []);

  return { ...state, postCase: postMyCase };
};
