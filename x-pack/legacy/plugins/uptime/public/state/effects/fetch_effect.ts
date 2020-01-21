/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { call, put, select } from 'redux-saga/effects';
import { Action } from 'redux-actions';
import { getBasePath } from '../selectors';

/**
 * Factory function for a fetch effect. It expects three action creators,
 * one to call for a fetch, one to call for success, and one to handle failures.
 * @param fetch creates a fetch action
 * @param success creates a success action
 * @param fail creates a failure action
 * @template T the action type expected by the fetch action
 * @template R the type that the API request should return on success
 * @template S tye type of the success action
 * @template F the type of the failure action
 */
export function fetchEffectFactory<T, R, S, F>(
  fetch: (request: T) => Promise<R>,
  success: (response: R) => Action<S>,
  fail: (error: Error) => Action<F>
) {
  return function*(action: Action<T>) {
    try {
      if (!action.payload) {
        yield put(fail(new Error('Cannot fetch snapshot for undefined parameters.')));
        return;
      }
      const {
        payload: { ...params },
      } = action;
      const basePath = yield select(getBasePath);
      const response = yield call(fetch, { ...params, basePath });
      yield put(success(response));
    } catch (error) {
      yield put(fail(error));
    }
  };
}
