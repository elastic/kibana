/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UPDATE_JOB_START, UPDATE_JOB_SUCCESS, UPDATE_JOB_FAILURE } from '../action_types';

const initialState = {
  isUpdating: false,
  error: undefined,
};

export function updateJob(state = initialState, action) {
  const { type } = action;

  switch (type) {
    case UPDATE_JOB_START:
      return {
        isUpdating: true,
      };

    case UPDATE_JOB_SUCCESS:
      return {
        isUpdating: false,
      };

    case UPDATE_JOB_FAILURE:
      return {
        isUpdating: false,
      };

    default:
      return state;
  }
}
