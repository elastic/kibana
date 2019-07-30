/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { createContext, useContext, useReducer, Reducer, ReactChild } from 'react';

export const StateContext = createContext({});

export const StateProvider = ({
  reducer,
  initialState,
  children,
}: {
  reducer: Reducer<any, any>; // Fix
  initialState: any;
  children: ReactChild;
}) => (
  <StateContext.Provider value={useReducer(reducer, initialState)}>
    {children}
  </StateContext.Provider>
);

export const useStateValue = () => useContext(StateContext);
