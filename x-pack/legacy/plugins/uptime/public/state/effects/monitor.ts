/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { call, put, takeLatest, select } from 'redux-saga/effects';
import { Action } from 'redux-actions';
import {
  FETCH_MONITOR_DETAILS,
  FETCH_MONITOR_DETAILS_SUCCESS,
  FETCH_MONITOR_DETAILS_FAIL,
  FETCH_MONITOR_LOCATIONS,
  FETCH_MONITOR_LOCATIONS_SUCCESS,
  FETCH_MONITOR_LOCATIONS_FAIL,
} from '../actions/monitor';
import { fetchMonitorDetails, fetchMonitorLocations } from '../api';
import { getBasePath } from '../selectors';
import { MonitorDetailsActionPayload } from '../actions/types';

function* monitorDetailsEffect(action: Action<any>) {
  const { monitorId, dateStart, dateEnd, location }: MonitorDetailsActionPayload = action.payload;
  try {
    const basePath = yield select(getBasePath);
    const response = yield call(fetchMonitorDetails, {
      monitorId,
      basePath,
      dateStart,
      dateEnd,
      location,
    });
    yield put({ type: FETCH_MONITOR_DETAILS_SUCCESS, payload: response });
  } catch (error) {
    yield put({ type: FETCH_MONITOR_DETAILS_FAIL, payload: error.message });
  }
}

function* monitorLocationsEffect(action: Action<any>) {
  const payload = action.payload;
  try {
    const basePath = yield select(getBasePath);
    const response = yield call(fetchMonitorLocations, { basePath, ...payload });
    yield put({ type: FETCH_MONITOR_LOCATIONS_SUCCESS, payload: response });
  } catch (error) {
    yield put({ type: FETCH_MONITOR_LOCATIONS_FAIL, payload: error.message });
  }
}

export function* fetchMonitorDetailsEffect() {
  yield takeLatest(FETCH_MONITOR_DETAILS, monitorDetailsEffect);
  yield takeLatest(FETCH_MONITOR_LOCATIONS, monitorLocationsEffect);
}
