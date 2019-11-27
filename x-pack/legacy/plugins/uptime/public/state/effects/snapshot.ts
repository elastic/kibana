/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { call, put, takeLatest, select } from 'redux-saga/effects';
import { Action } from 'redux-actions';
import {
  FETCH_SNAPSHOT_COUNT,
  GetSnapshotPayload,
  fetchSnapshotCountFail,
  fetchSnapshotCountSuccess,
} from '../actions';
import { fetchSnapshotCount } from '../api';
import { getBasePath } from '../selectors';

function* snapshotSaga(action: Action<GetSnapshotPayload>) {
  try {
    if (!action.payload) {
      yield put(
        fetchSnapshotCountFail(new Error('Cannot fetch snapshot for undefined parameters.'))
      );
      return;
    }
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
    yield put(fetchSnapshotCountSuccess(response));
  } catch (error) {
    yield put(fetchSnapshotCountFail(error));
  }
}

export function* fetchSnapshotCountSaga() {
  yield takeLatest(FETCH_SNAPSHOT_COUNT, snapshotSaga);
}
