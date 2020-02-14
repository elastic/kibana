/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect, useReducer } from 'react';
import { useStateToaster } from '../../components/toasters';
import { errorToToaster } from '../../components/ml/api/error_to_toaster';
import * as i18n from './translations';
import { FETCH_FAILURE, FETCH_INIT, FETCH_SUCCESS, UPDATE_CASE_PROPERTY } from './constants';
import { Case } from './types';
import { updateCaseProperty } from './api';
import { getTypedPayload } from './utils';

type UpdateKey = keyof Case;

interface NewCaseState {
  data: Case;
  isLoading: boolean;
  isError: boolean;
  updateKey?: UpdateKey | null;
}

interface UpdateByKey {
  updateKey: UpdateKey;
  updateValue: Case[UpdateKey];
}

interface Action {
  type: string;
  payload?: Partial<Case> | UpdateByKey;
}

const dataFetchReducer = (state: NewCaseState, action: Action): NewCaseState => {
  switch (action.type) {
    case FETCH_INIT:
      return {
        ...state,
        isLoading: true,
        isError: false,
        updateKey: null,
      };
    case UPDATE_CASE_PROPERTY:
      const { updateKey, updateValue } = getTypedPayload<UpdateByKey>(action.payload);
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
      return {
        ...state,
        isLoading: false,
        isError: false,
        data: {
          ...state.data,
          ...getTypedPayload<Case>(action.payload),
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
  initialData: Case
): [{ data: Case }, (updates: UpdateByKey) => void] => {
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
    const updateData = async (updateKey: keyof Case) => {
      dispatch({ type: FETCH_INIT });
      try {
        const response = await updateCaseProperty(caseId, { [updateKey]: state.data[updateKey] });
        dispatch({ type: FETCH_SUCCESS, payload: response });
      } catch (error) {
        errorToToaster({ title: i18n.ERROR_TITLE, error, dispatchToaster });
        dispatch({ type: FETCH_FAILURE });
      }
    };
    if (state.updateKey) {
      updateData(state.updateKey);
    }
  }, [state.updateKey]);

  return [{ data: state.data }, dispatchUpdateCaseProperty];
};
