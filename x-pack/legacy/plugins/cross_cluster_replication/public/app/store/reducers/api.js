/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SECTIONS, API_STATUS } from '../../constants';
import * as t from '../action_types';

export const initialState = {
  status: {
    [SECTIONS.AUTO_FOLLOW_PATTERN]: API_STATUS.IDLE,
    [SECTIONS.FOLLOWER_INDEX]: API_STATUS.IDLE,
  },
  error: {
    [SECTIONS.AUTO_FOLLOW_PATTERN]: null,
    [SECTIONS.FOLLOWER_INDEX]: null,
  },
};

export const reducer = (state = initialState, action) => {
  const payload = action.payload || {};
  const { scope, status, error } = payload;

  switch (action.type) {
    case t.API_REQUEST_START: {
      return { ...state, status: { ...state.status, [scope]: status } };
    }
    case t.API_REQUEST_END: {
      return { ...state, status: { ...state.status, [scope]: API_STATUS.IDLE } };
    }
    case t.API_ERROR_SET: {
      return { ...state, error: { ...state.error, [scope]: error } };
    }
    default:
      return state;
  }
};
