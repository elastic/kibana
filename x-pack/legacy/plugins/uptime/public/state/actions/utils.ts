/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createAction } from 'redux-actions';
import { AsyncAction } from './types';

export function createAsyncAction<Payload>(actionStr: string): AsyncAction {
  return {
    get: createAction<Payload>(actionStr),
    success: createAction<Payload>(`${actionStr}_SUCCESS`),
    fail: createAction<Payload>(`${actionStr}_FAIL`),
  };
}
