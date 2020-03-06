/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useReducer, useCallback } from 'react';

import { CaseRequest } from '../../../../../../plugins/case/common/api';
import { useStateToaster } from '../../components/toasters';
import { errorToToaster } from '../../components/ml/api/error_to_toaster';

import { patchCase } from './api';
import { FETCH_FAILURE, FETCH_INIT, FETCH_SUCCESS } from './constants';
import * as i18n from './translations';
import { Case } from './types';
import { getTypedPayload } from './utils';

type UpdateKey = keyof CaseRequest;

interface NewCaseState {
  caseData: Case;
  isLoading: boolean;
  isError: boolean;
  updateKey: UpdateKey | null;
}

export interface UpdateByKey {
  updateKey: UpdateKey;
  updateValue: CaseRequest[UpdateKey];
}

interface Action {
  type: string;
  payload?: Case | UpdateKey;
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
        caseData: getTypedPayload<Case>(action.payload),
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

interface UseUpdateCase extends NewCaseState {
  updateCaseProperty: (updates: UpdateByKey) => void;
}
export const useUpdateCase = (caseId: string, initialData: Case): UseUpdateCase => {
  const [state, dispatch] = useReducer(dataFetchReducer, {
    isLoading: false,
    isError: false,
    caseData: initialData,
    updateKey: null,
  });
  const [, dispatchToaster] = useStateToaster();

  const dispatchUpdateCaseProperty = useCallback(
    async ({ updateKey, updateValue }: UpdateByKey) => {
      let cancel = false;
      try {
        dispatch({ type: FETCH_INIT, payload: updateKey });
        const response = await patchCase(
          caseId,
          { [updateKey]: updateValue },
          state.caseData.version
        );
        if (!cancel) {
          dispatch({ type: FETCH_SUCCESS, payload: response });
        }
      } catch (error) {
        if (!cancel) {
          errorToToaster({
            title: i18n.ERROR_TITLE,
            error: error.body && error.body.message ? new Error(error.body.message) : error,
            dispatchToaster,
          });
          dispatch({ type: FETCH_FAILURE });
        }
      }
      return () => {
        cancel = true;
      };
    },
    [state]
  );

  return { ...state, updateCaseProperty: dispatchUpdateCaseProperty };
};
