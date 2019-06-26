/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  ADD_CLUSTER_START,
  ADD_CLUSTER_SUCCESS,
  ADD_CLUSTER_FAILURE,
  CLEAR_ADD_CLUSTER_ERRORS,
} from '../action_types';

const initialState = {
  isAdding: false,
  error: undefined,
};

export function addCluster(state = initialState, action) {
  const { type, payload } = action;

  switch (type) {
    case ADD_CLUSTER_START:
      return {
        isAdding: true,
        error: undefined,
      };

    case ADD_CLUSTER_SUCCESS:
      return {
        ...state,
        isAdding: false,
      };

    case ADD_CLUSTER_FAILURE:
      return {
        ...state,
        error: payload.error,
        isAdding: false,
      };

    case CLEAR_ADD_CLUSTER_ERRORS:
      return {
        ...state,
        error: undefined,
      };

    default:
      return state;
  }
}
