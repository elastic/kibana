/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect, useReducer } from 'react';

import { Case } from './types';
import { FETCH_INIT, FETCH_FAILURE, FETCH_SUCCESS } from './constants';
import { getTypedPayload } from './utils';
import { errorToToaster } from '../../components/ml/api/error_to_toaster';
import * as i18n from './translations';
import { useStateToaster } from '../../components/toasters';
import { getCase } from './api';

interface CaseState {
  data: Case;
  isLoading: boolean;
  isError: boolean;
}
interface Action {
  type: string;
  payload?: Case;
}

const dataFetchReducer = (state: CaseState, action: Action): CaseState => {
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
        data: getTypedPayload<Case>(action.payload),
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
const initialData: Case = {
  case_id: '',
  created_at: '',
  created_by: {
    username: '',
  },
  description: '',
  state: '',
  tags: [],
  title: '',
  updated_at: '',
};

export const useGetCase = (caseId: string): [CaseState] => {
  const [state, dispatch] = useReducer(dataFetchReducer, {
    isLoading: true,
    isError: false,
    data: initialData,
  });
  const [, dispatchToaster] = useStateToaster();

  const callFetch = () => {
    let didCancel = false;
    const fetchData = async () => {
      dispatch({ type: FETCH_INIT });
      try {
        const response = await getCase(caseId, false);
        if (!didCancel) {
          dispatch({ type: FETCH_SUCCESS, payload: response });
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
  };

  useEffect(() => {
    callFetch();
  }, [caseId]);
  return [state];
};
