/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createAction } from 'redux-actions';

export function createAsyncAction<G, S, F>(actionStr: string) {
  return {
    get: createAction<G>(actionStr),
    success: createAction<S>(`${actionStr}_SUCCESS`),
    fail: createAction<F>(`${actionStr}_FAIL`),
  };
}
