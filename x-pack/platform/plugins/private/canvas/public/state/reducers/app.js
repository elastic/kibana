/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { handleActions } from 'redux-actions';
import { appReady, appError } from '../actions/app';

export const appReducer = handleActions(
  {
    [appReady]: (appState) => ({ ...appState, ready: true }),
    [appError]: (appState, { payload }) => ({ ...appState, ready: payload }),
  },
  {}
);
