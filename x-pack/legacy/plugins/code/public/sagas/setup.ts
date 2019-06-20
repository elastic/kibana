/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { kfetch } from 'ui/kfetch';
import { call, put, takeEvery } from 'redux-saga/effects';
import { checkSetupFailed, checkSetupSuccess } from '../actions';
import { rootRoutePattern, setupRoutePattern } from './patterns';

function* handleRootRoute() {
  try {
    yield call(requestSetup);
    yield put(checkSetupSuccess());
  } catch (e) {
    yield put(checkSetupFailed());
  }
}

function requestSetup() {
  return kfetch({ pathname: `/api/code/setup`, method: 'head' });
}

export function* watchRootRoute() {
  yield takeEvery(rootRoutePattern, handleRootRoute);
  yield takeEvery(setupRoutePattern, handleRootRoute);
}
