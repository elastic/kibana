/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { call, put, takeLatest, select } from 'redux-saga/effects';
import { Action } from 'redux-actions';
import {
  FETCH_SNAPSHOT_COUNT,
  FETCH_SNAPSHOT_COUNT_FAIL,
  GetSnapshotPayload,
  FETCH_SNAPSHOT_COUNT_SUCCESS,
} from '../actions';
import { fetchSnapshotCount } from '../api';
import { getBasePath } from '../selectors';

function* snapshotSaga(action: Action<GetSnapshotPayload>) {
  try {
    if (!action.payload) throw new Error('Cannot fetch snapshot for undefined parameters.');
    const {
      payload: { dateRangeStart, dateRangeEnd, filters, statusFilter },
    } = action;
    const basePath = yield select(getBasePath);
    const response = yield call(fetchSnapshotCount, {
      basePath,
      dateRangeStart,
      dateRangeEnd,
      filters,
      statusFilter,
    });
    yield put({ type: FETCH_SNAPSHOT_COUNT_SUCCESS, payload: response });
  } catch (error) {
    yield put({ type: FETCH_SNAPSHOT_COUNT_FAIL, payload: error.message });
  }
}

export function* fetchSnapshotCountSaga() {
  yield takeLatest(FETCH_SNAPSHOT_COUNT, snapshotSaga);
}
