/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect, useReducer } from 'react';

import { Case } from './types';
import * as i18n from './translations';
import { errorToToaster, useStateToaster } from '../../components/toasters';
import { getCase } from './api';

interface CaseState {
  data: Case;
  isLoading: boolean;
  isError: boolean;
}

type Action =
  | { type: 'FETCH_INIT' }
  | { type: 'FETCH_SUCCESS'; payload: Case }
  | { type: 'FETCH_FAILURE' };

const dataFetchReducer = (state: CaseState, action: Action): CaseState => {
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
        data: action.payload,
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
const initialData: Case = {
  id: '',
  createdAt: '',
  comments: [],
  commentIds: [],
  createdBy: {
    username: '',
  },
  description: '',
  status: '',
  tags: [],
  title: '',
  updatedAt: null,
  updatedBy: null,
  version: '',
};

export const useGetCase = (caseId: string): CaseState => {
  const [state, dispatch] = useReducer(dataFetchReducer, {
    isLoading: true,
    isError: false,
    data: initialData,
  });
  const [, dispatchToaster] = useStateToaster();

  const callFetch = () => {
    let didCancel = false;
    const fetchData = async () => {
      dispatch({ type: 'FETCH_INIT' });
      try {
        const response = await getCase(caseId);
        if (!didCancel) {
          dispatch({ type: 'FETCH_SUCCESS', payload: response });
        }
      } catch (error) {
        if (!didCancel) {
          errorToToaster({
            title: i18n.ERROR_TITLE,
            error: error.body && error.body.message ? new Error(error.body.message) : error,
            dispatchToaster,
          });
          dispatch({ type: 'FETCH_FAILURE' });
        }
      }
    };
    fetchData();
    return () => {
      didCancel = true;
    };
  };

  useEffect(() => {
    callFetch();
  }, [caseId]);
  return state;
};
