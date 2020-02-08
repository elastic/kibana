/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Dispatch, SetStateAction, useEffect, useReducer, useState } from 'react';

import { FlattenedCaseSavedObject, NewCaseFormatted } from './types';
import { FETCH_INIT, FETCH_FAILURE, FETCH_SUCCESS, REFRESH_CASE } from './constants';
import { flattenSavedObject } from './utils';
import { errorToToaster } from '../../components/ml/api/error_to_toaster';
import * as i18n from './translations';
import { useStateToaster } from '../../components/toasters';
import { getCase } from './api';

interface CaseState {
  data: FlattenedCaseSavedObject;
  isLoading: boolean;
  isError: boolean;
}
interface Action {
  type: string;
  payload?: FlattenedCaseSavedObject | NewCaseFormatted;
}

const dataFetchReducer = (state: CaseState, action: Action): CaseState => {
  let getTypedPayload;
  switch (action.type) {
    case FETCH_INIT:
      return {
        ...state,
        isLoading: true,
        isError: false,
      };
    case FETCH_SUCCESS:
      getTypedPayload = (a: Action['payload']) => a as FlattenedCaseSavedObject;
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
    case REFRESH_CASE:
      getTypedPayload = (a: Action['payload']) => a as NewCaseFormatted;
      return {
        ...state,
        isLoading: false,
        isError: false,
        data: {
          ...state.data,
          ...getTypedPayload(action.payload),
        },
      };
    default:
      throw new Error();
  }
};
const initialData: FlattenedCaseSavedObject = {
  case_type: '',
  created_at: 0,
  created_by: {
    username: '',
  },
  description: '',
  state: '',
  tags: [],
  title: '',
  id: '',
  type: '',
  updated_at: 0,
  version: '',
};
const initialRefreshData: NewCaseFormatted = {
  case_type: '',
  description: '',
  state: '',
  tags: [],
  title: '',
  updated_at: 0,
};

export type RefreshCase = Dispatch<SetStateAction<NewCaseFormatted>>;
export const useGetCase = (initialCaseId: string): [CaseState, RefreshCase] => {
  const [state, dispatch] = useReducer(dataFetchReducer, {
    isLoading: true,
    isError: false,
    data: initialData,
  });
  const [caseId, setCaseId] = useState(initialCaseId);
  const [, dispatchToaster] = useStateToaster();
  const [refreshData, refreshCase] = useState(initialRefreshData);

  const callFetch = () => {
    let didCancel = false;
    const fetchData = async () => {
      dispatch({ type: FETCH_INIT });
      try {
        const response = await getCase(caseId, false);
        if (!didCancel) {
          dispatch({ type: FETCH_SUCCESS, payload: flattenSavedObject(response) });
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
      setCaseId(initialCaseId);
    };
  };

  useEffect(() => {
    if (refreshData.description.length > 0) {
      dispatch({ type: REFRESH_CASE, payload: refreshData });
    }
  }, [refreshData]);

  useEffect(() => {
    callFetch();
  }, [caseId]);
  return [state, refreshCase];
};
