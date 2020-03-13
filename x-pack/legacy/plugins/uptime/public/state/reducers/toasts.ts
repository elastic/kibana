/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Toast } from 'kibana/public';
import { handleActions, Action } from 'redux-actions';
import { createToast, dismissToastById } from '../actions/toasts';

export type ToastsState = Toast[];

export const toastsReducer = handleActions<ToastsState, any>(
  {
    [String(createToast)]: (state, action: Action<Toast>) => state.concat(action.payload),
    [String(dismissToastById)]: (state, action: Action<string>) => {
      return state.filter(t => t.id !== action.payload);
    },
  },
  []
);
