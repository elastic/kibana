/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect, useReducer, useState } from 'react';

import chrome from 'ui/chrome';
import { CaseSavedObject } from './types';
import { FETCH_INIT, FETCH_FAILURE, FETCH_SUCCESS } from './constants';

interface CaseState {
  data: CaseSavedObject;
  isLoading: boolean;
  isError: boolean;
}
interface Action {
  type: string;
  payload?: CaseSavedObject;
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
      const getSavedObject = (a: Action['payload']) => a as CaseSavedObject;
      return {
        ...state,
        isLoading: false,
        isError: false,
        data: getSavedObject(action.payload),
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
const initialData: CaseSavedObject = {
  attributes: {
    case_type: '',
    created_at: 0,
    created_by: {
      username: '',
    },
    description: '',
    state: '',
    tags: [],
    title: '',
  },
  id: '',
  type: '',
  updated_at: '',
  version: '',
};
export const useGetCase = (initialCaseId: string): [CaseState] => {
  const [state, dispatch] = useReducer(dataFetchReducer, {
    isLoading: false,
    isError: false,
    data: initialData,
  });
  const [caseId, setCaseId] = useState(initialCaseId);

  useEffect(() => {
    let didCancel = false;
    const fetchData = async () => {
      dispatch({ type: FETCH_INIT });
      try {
        const result = await fetch(
          `${chrome.getBasePath()}/api/cases/${caseId}?includeComments=false`,
          {
            method: 'GET',
            credentials: 'same-origin',
            headers: {
              'content-type': 'application/json',
              'kbn-system-api': 'true',
            },
          }
        );
        if (!didCancel) {
          const resultJson = await result.json();
          if (resultJson.statusCode >= 400) {
            return dispatch({ type: FETCH_FAILURE });
          }
          dispatch({ type: FETCH_SUCCESS, payload: resultJson });
        }
      } catch (error) {
        if (!didCancel) {
          dispatch({ type: FETCH_FAILURE });
        }
      }
    };
    fetchData();
    return () => {
      didCancel = true;
      setCaseId(initialCaseId);
    };
  }, [caseId]);
  return [state];
};
