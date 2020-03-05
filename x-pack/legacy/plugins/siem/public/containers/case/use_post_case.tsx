/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Dispatch, SetStateAction, useEffect, useReducer, useState } from 'react';
import { useStateToaster } from '../../components/toasters';
import { errorToToaster } from '../../components/ml/api/error_to_toaster';
import * as i18n from './translations';
import { FETCH_FAILURE, FETCH_INIT, FETCH_SUCCESS, POST_NEW_CASE } from './constants';
import { Case, NewCase } from './types';
import { createCase } from './api';
import { getTypedPayload } from './utils';

interface NewCaseState {
  data: NewCase;
  newCase?: Case;
  isLoading: boolean;
  isError: boolean;
}
interface Action {
  type: string;
  payload?: NewCase | Case;
}

const dataFetchReducer = (state: NewCaseState, action: Action): NewCaseState => {
  switch (action.type) {
    case FETCH_INIT:
      return {
        ...state,
        isLoading: true,
        isError: false,
      };
    case POST_NEW_CASE:
      return {
        ...state,
        isLoading: false,
        isError: false,
        data: getTypedPayload<NewCase>(action.payload),
      };
    case FETCH_SUCCESS:
      return {
        ...state,
        isLoading: false,
        isError: false,
        newCase: getTypedPayload<Case>(action.payload),
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
const initialData: NewCase = {
  description: '',
  isNew: false,
  tags: [],
  title: '',
};

export const usePostCase = (): [NewCaseState, Dispatch<SetStateAction<NewCase>>] => {
  const [state, dispatch] = useReducer(dataFetchReducer, {
    isLoading: false,
    isError: false,
    data: initialData,
  });
  const [formData, setFormData] = useState(initialData);
  const [, dispatchToaster] = useStateToaster();

  useEffect(() => {
    dispatch({ type: POST_NEW_CASE, payload: formData });
  }, [formData]);

  useEffect(() => {
    const postCase = async () => {
      dispatch({ type: FETCH_INIT });
      try {
        const dataWithoutIsNew = state.data;
        delete dataWithoutIsNew.isNew;
        const response = await createCase(dataWithoutIsNew);
        dispatch({ type: FETCH_SUCCESS, payload: response });
      } catch (error) {
        errorToToaster({ title: i18n.ERROR_TITLE, error, dispatchToaster });
        dispatch({ type: FETCH_FAILURE });
      }
    };
    if (state.data.isNew) {
      postCase();
    }
  }, [state.data.isNew]);
  return [state, setFormData];
};
