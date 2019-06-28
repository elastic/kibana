/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createContext, useContext, Dispatch, ReducerAction } from 'react';
import { AppState, AppAction } from '../../types';

type StateReducer = (state: AppState, action: AppAction) => AppState;
type ReducedStateContext = [AppState, Dispatch<ReducerAction<StateReducer>>];

export const initialState: AppState = {
  permissions: {
    hasPermission: true,
    missingClusterPrivileges: [],
    missingIndexPrivileges: [],
  },
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

const StateContext = createContext<ReducedStateContext>([initialState, () => {}]);

export const AppStateProvider = StateContext.Provider;

export const useAppState = () => useContext<ReducedStateContext>(StateContext);
