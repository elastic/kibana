/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createContext, useContext, Dispatch, ReducerAction } from 'react';
import { AppState } from '../../types';

type StateReducer = (state: AppState, action: { type: string; [key: string]: any }) => void;
type ReducedStateContext = [Partial<AppState>, Dispatch<ReducerAction<StateReducer>>];

const StateContext = createContext<ReducedStateContext>([{}, () => {}]);

export const initialState = {
  permissions: {},
};

export const reducer: StateReducer = (state, action) => {
  const { type, permissions } = action;
  switch (type) {
    case 'updatePermissions':
      return {
        ...state,
        permissions,
      };
    default:
      return state;
  }
};

export const AppStateProvider = StateContext.Provider;

export const useAppState = () => useContext<ReducedStateContext>(StateContext);
