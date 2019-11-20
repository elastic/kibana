/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import React, { createContext } from 'react';

export const ReduxStateContext = createContext({});

const withRedux = connect(state => state);
export const ReduxStateContextProvider = withRedux(({ children, ...state }) => {
  return <ReduxStateContext.Provider value={state}>{children}</ReduxStateContext.Provider>;
});
