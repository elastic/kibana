/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Action } from 'redux-actions';
import { AsyncAction } from '../actions/types';
import { IReducerState } from './types';

export function handleAsyncAction<ReducerState extends IReducerState, Payload>(
  storeKey: string,
  asyncAction: AsyncAction
) {
  return {
    [String(asyncAction.get)]: (state: ReducerState) => ({
      ...state,
      [storeKey]: {
        ...state[storeKey],
        loading: true,
      },
    }),

    [String(asyncAction.success)]: (state: ReducerState, action: Action<any>) => ({
      ...state,
      [storeKey]: {
        ...state[storeKey],
        data: action.payload === null ? action.payload : { ...action.payload },
        loading: false,
      },
    }),

    [String(asyncAction.fail)]: (state: ReducerState, action: Action<any>) => ({
      ...state,
      [storeKey]: {
        ...state[storeKey],
        data: null,
        error: action.payload,
        loading: false,
      },
    }),
  };
}

export function getAsyncInitialState(initialData = null) {
  return {
    data: initialData,
    loading: false,
    error: null,
  };
}
