/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { call, put, takeLatest, select } from 'redux-saga/effects';
import { Action } from 'redux-actions';
import {
  MonitorActionTypes,
  FETCH_MONITOR_DETAILS,
  FETCH_MONITOR_DETAILS_SUCCESS,
  FETCH_MONITOR_DETAILS_FAIL,
} from '../actions/monitor';
import { fetchMonitorDetails } from '../api/monitor';
import { getBasePath } from '../selectors';

function* monitorDetailsSaga(action: Action<MonitorActionTypes>) {
  const monitorId = action.payload;
  try {
    const basePath = yield select(getBasePath);
    const response = yield call(fetchMonitorDetails, { monitorId, basePath });
    yield put({ type: FETCH_MONITOR_DETAILS_SUCCESS, payload: response });
  } catch (error) {
    yield put({ type: FETCH_MONITOR_DETAILS_FAIL, error });
  }
}

export function* fetchMonitorDetailsSaga() {
  yield takeLatest(FETCH_MONITOR_DETAILS, monitorDetailsSaga);
}
