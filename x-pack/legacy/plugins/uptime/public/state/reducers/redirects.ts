/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { handleActions } from 'redux-actions';
import { AsyncInitialState } from './types';
import { getAsyncInitialState, handleAsyncAction } from './utils';
import { getRedirectsAction } from '../actions';

export interface RedirectsState {
  redirects: AsyncInitialState<States.Redirects | null>;
}

const initialState: RedirectsState = {
  redirects: getAsyncInitialState(),
};

export const redirectsReducer = handleActions<RedirectsState, any>(
  {
    ...handleAsyncAction('redirects', getRedirectsAction),
  },
  initialState
);
