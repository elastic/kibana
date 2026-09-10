/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiStatus } from '../../../../common/types';
import { SECTIONS, API_STATUS } from '../../constants';
import * as t from '../action_types';
import type { CcrApiError } from '../../services/http_error';

export interface ApiState {
  status: Record<string, ApiStatus>;
  error: Record<string, CcrApiError | null>;
}

export interface ApiReducerAction {
  type: string;
  payload?: {
    scope?: string;
    status?: ApiStatus;
    error?: CcrApiError | null;
    label?: string;
  };
}

export const initialState = {
  status: {
    [SECTIONS.AUTO_FOLLOW_PATTERN]: API_STATUS.IDLE,
    [SECTIONS.FOLLOWER_INDEX]: API_STATUS.IDLE,
  },
  error: {
    [SECTIONS.AUTO_FOLLOW_PATTERN]: null,
    [SECTIONS.FOLLOWER_INDEX]: null,
  },
} satisfies ApiState;

export const reducer = (state: ApiState = initialState, action: ApiReducerAction): ApiState => {
  const payload = action.payload;
  const scope = payload?.scope;

  switch (action.type) {
    case t.API_REQUEST_START: {
      if (!scope) {
        return state;
      }
      const status = payload?.status ?? API_STATUS.LOADING;
      return {
        ...state,
        status: { ...state.status, [scope]: status },
      };
    }
    case t.API_REQUEST_END: {
      if (!scope) {
        return state;
      }
      return { ...state, status: { ...state.status, [scope]: API_STATUS.IDLE } };
    }
    case t.API_ERROR_SET: {
      if (!scope) {
        return state;
      }
      const error = payload?.error ?? null;
      return { ...state, error: { ...state.error, [scope]: error } };
    }
    default:
      return state;
  }
};
