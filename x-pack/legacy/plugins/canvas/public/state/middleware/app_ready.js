/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isAppReady } from '../selectors/app';
import { appReady as readyAction } from '../actions/app';

export const appReady = ({ dispatch, getState }) => next => action => {
  // execute the action
  next(action);

  // read the new state
  const state = getState();

  // if app is already ready, there's nothing more to do here
  if (state.app.ready) {
    return;
  }

  // check for all conditions in the state that indicate that the app is ready
  if (isAppReady(state)) {
    dispatch(readyAction());
  }
};
