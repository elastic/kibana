/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { take, spawn } from 'redux-saga/effects';
import { Action } from 'redux-actions';

function* cancelRequest(action: Action<any>, abortController: AbortController) {
  yield take(action.type);
  abortController.abort();
}

export const singletonRequestSaga = (saga: any) =>
  function*(action: Action<any>) {
    const abortController = new AbortController();
    const task = yield spawn(cancelRequest, action, abortController);
    yield spawn(saga, action, abortController.signal, task);
  };
