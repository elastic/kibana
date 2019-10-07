/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { call, put, takeLatest } from 'redux-saga/effects';
import { Action } from 'redux-actions';
import {
  MonitorActionTypes,
  FETCH_MONITOR_DETAILS,
  FETCH_MONITOR_DETAILS_SUCCESS,
  FETCH_MONITOR_DETAILS_FAIL,
} from '../actions/monitor';
import { fetchMonitorDetails } from '../api/monitor';

function* monitorDetailsSaga(action: Action<MonitorActionTypes>) {
  const monitorId: any = action.payload;
  // console.log(monitorId);
  // try {
  // const response = yield call(fetchMonitorDetails, monitorId);
  yield put({ type: FETCH_MONITOR_DETAILS_SUCCESS, payload: { monitorId, error: {} } });
  // } catch (error) {
  //   console.log(error)
  //   yield put({ type: FETCH_MONITOR_DETAILS_FAIL, error });
  // }
}

export function* fetchMonitorDetailsSaga() {
  yield takeLatest(FETCH_MONITOR_DETAILS, monitorDetailsSaga);
}
