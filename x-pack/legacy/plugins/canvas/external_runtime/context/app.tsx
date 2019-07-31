/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { createContext, useContext, Dispatch, useReducer, Reducer, ReactChild } from 'react';
import { CanvasWorkpad } from '../types';

export interface AppState {
  workpad: CanvasWorkpad | null;
  page: number;
  height: number;
  width: number;
}

type StateType = [AppState, Dispatch<AppAction>];

export interface AppAction {
  type: string;
  [key: string]: any;
}

export const AppContext = createContext<StateType>([
  { workpad: null, page: 0, height: 0, width: 0 },
  () => {},
]);

export const AppStateProvider = ({
  reducer,
  initialState,
  children,
}: {
  reducer: Reducer<AppState, AppAction>;
  initialState: AppState;
  children: ReactChild;
}) => (
  <AppContext.Provider value={useReducer(reducer, initialState)}>{children}</AppContext.Provider>
);

export const useAppStateValue = () => useContext<StateType>(AppContext);
