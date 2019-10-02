/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { call, put, takeEvery } from 'redux-saga/effects';
import { Action } from 'redux-actions';

import { MonitorActionTypes, FETCH_MONITOR_DETAILS } from '../actions/monitor';
import { fetchMonitorDetails } from '../api/monitor';

function* monitorDetailsSaga(action: Action<MonitorActionTypes>) {
  const data: any = action.payload;

  try {
    const response = yield call(fetchMonitorDetails, data);
    yield put({ type: 'REQUEST_SUCCEEDED', payload: response });
  } catch (error) {
    yield put({ type: 'REQUEST_FAILED', error });
  }
}

export function* fetchMonitorDetailsSaga() {
  yield takeEvery(FETCH_MONITOR_DETAILS, monitorDetailsSaga);
}
