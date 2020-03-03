/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useReducer } from 'react';
import { useStateToaster } from '../../components/toasters';
import { errorToToaster } from '../../components/ml/api/error_to_toaster';
import * as i18n from './translations';
import { FETCH_FAILURE, FETCH_INIT, FETCH_SUCCESS } from './constants';
import { Case } from './types';
import { updateCaseProperty } from './api';
import { getTypedPayload } from './utils';

type UpdateKey = keyof Case;

interface NewCaseState {
  data: Case;
  isLoading: boolean;
  isError: boolean;
  updateKey: UpdateKey | null;
}

interface UpdateByKey {
  updateKey: UpdateKey;
  updateValue: Case[UpdateKey];
}

interface Action {
  type: string;
  payload?: Partial<Case> | UpdateKey;
}

const dataFetchReducer = (state: NewCaseState, action: Action): NewCaseState => {
  switch (action.type) {
    case FETCH_INIT:
      return {
        ...state,
        isLoading: true,
        isError: false,
        updateKey: getTypedPayload<UpdateKey>(action.payload),
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
        updateKey: null,
      };
    case FETCH_FAILURE:
      return {
        ...state,
        isLoading: false,
        isError: true,
        updateKey: null,
      };
    default:
      throw new Error();
  }
};

export const useUpdateCase = (
  caseId: string,
  initialData: Case
): [NewCaseState, (updates: UpdateByKey) => void] => {
  const [state, dispatch] = useReducer(dataFetchReducer, {
    isLoading: false,
    isError: false,
    data: initialData,
    updateKey: null,
  });
  const [, dispatchToaster] = useStateToaster();

  const dispatchUpdateCaseProperty = async ({ updateKey, updateValue }: UpdateByKey) => {
    dispatch({ type: FETCH_INIT, payload: updateKey });
    try {
      const response = await updateCaseProperty(
        caseId,
        { [updateKey]: updateValue },
        state.data.version ?? '' // saved object versions are typed as string | undefined, hope that's not true
      );
      dispatch({ type: FETCH_SUCCESS, payload: response });
    } catch (error) {
      errorToToaster({ title: i18n.ERROR_TITLE, error, dispatchToaster });
      dispatch({ type: FETCH_FAILURE });
    }
  };

  return [state, dispatchUpdateCaseProperty];
};
