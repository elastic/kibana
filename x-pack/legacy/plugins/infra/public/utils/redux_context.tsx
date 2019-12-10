/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import React, { createContext } from 'react';
import { State, initialState } from '../store';

export const ReduxStateContext = createContext(initialState);

const withRedux = connect((state: State) => state);
export const ReduxStateContextProvider = withRedux(({ children, ...state }) => {
  return <ReduxStateContext.Provider value={state as State}>{children}</ReduxStateContext.Provider>;
});
