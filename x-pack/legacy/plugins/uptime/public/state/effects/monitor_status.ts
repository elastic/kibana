/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { call, put, takeLatest, select } from 'redux-saga/effects';
import { Action } from 'redux-actions';
import {
  getMonitorStatus,
  getMonitorStatusSuccess,
  getMonitorStatusFail,
} from '../actions/monitor_status';
import { fetchMonitorStatus } from '../api';
import { getBasePath } from '../selectors';

function* monitorStatusEffect(action: Action<any>) {
  const { monitorId, dateStart, dateEnd, location } = action.payload;
  try {
    const basePath = yield select(getBasePath);
    const response = yield call(fetchMonitorStatus, {
      monitorId,
      basePath,
      dateStart,
      dateEnd,
      location,
    });
    yield put({ type: getMonitorStatusSuccess, payload: response });
  } catch (error) {
    yield put({ type: getMonitorStatusFail, payload: error.message });
  }
}

export function* fetchMonitorStatusEffect() {
  yield takeLatest(getMonitorStatus, monitorStatusEffect);
}
