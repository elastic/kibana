/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect, useReducer } from 'react';
import { useStateToaster } from '../../components/toasters';
import { errorToToaster } from '../../components/ml/api/error_to_toaster';
import * as i18n from './translations';
import {
  FETCH_FAILURE,
  FETCH_INIT,
  FETCH_SUCCESS,
  UPDATE_CASE,
  UPDATE_CASE_PROPERTY,
} from './constants';
import { CaseSavedObject, FlattenedCaseSavedObject, UpdateCase } from './types';
import { updateCaseProperty } from './api';

type UpdateKey = keyof UpdateCase;

interface NewCaseState {
  data: FlattenedCaseSavedObject;
  newCase?: CaseSavedObject;
  isLoading: boolean;
  isError: boolean;
  updateKey?: UpdateKey | null;
}

interface UpdateByKey {
  updateKey: UpdateKey;
  updateValue: UpdateCase[UpdateKey];
}

interface Action {
  type: string;
  payload?: UpdateCase | CaseSavedObject | UpdateByKey;
}

const dataFetchReducer = (state: NewCaseState, action: Action): NewCaseState => {
  let getTypedPayload;
  switch (action.type) {
    case FETCH_INIT:
      return {
        ...state,
        isLoading: true,
        isError: false,
        updateKey: null,
      };
    case UPDATE_CASE:
      getTypedPayload = (a: Action['payload']) => a as FlattenedCaseSavedObject;
      return {
        ...state,
        isLoading: false,
        isError: false,
        data: getTypedPayload(action.payload),
      };
    case UPDATE_CASE_PROPERTY:
      getTypedPayload = (a: Action['payload']) => a as UpdateByKey;
      const { updateKey, updateValue } = getTypedPayload(action.payload);
      return {
        ...state,
        isLoading: false,
        isError: false,
        data: {
          ...state.data,
          [updateKey]: updateValue,
        },
        updateKey,
      };
    case FETCH_SUCCESS:
      getTypedPayload = (a: Action['payload']) => a as UpdateCase;
      return {
        ...state,
        isLoading: false,
        isError: false,
        data: {
          ...state.data,
          ...getTypedPayload(action.payload),
        },
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

export const useUpdateCase = (
  caseId: string,
  initialData: FlattenedCaseSavedObject
): [{ data: FlattenedCaseSavedObject }, (updates: UpdateByKey) => void] => {
  const [state, dispatch] = useReducer(dataFetchReducer, {
    isLoading: false,
    isError: false,
    data: initialData,
  });
  const [, dispatchToaster] = useStateToaster();

  const dispatchUpdateCaseProperty = ({ updateKey, updateValue }: UpdateByKey) => {
    dispatch({
      type: UPDATE_CASE_PROPERTY,
      payload: { updateKey, updateValue },
    });
  };

  useEffect(() => {
    const fetchData = async (updateKey: keyof UpdateCase) => {
      dispatch({ type: FETCH_INIT });
      try {
        const response = await updateCaseProperty(caseId, { [updateKey]: state.data[updateKey] });
        dispatch({ type: FETCH_SUCCESS, payload: response.attributes });
      } catch (error) {
        errorToToaster({ title: i18n.ERROR_TITLE, error, dispatchToaster });
        dispatch({ type: FETCH_FAILURE });
      }
    };
    if (state.updateKey) {
      fetchData(state.updateKey);
    }
  }, [state.updateKey]);

  return [{ data: state.data }, dispatchUpdateCaseProperty];
};
