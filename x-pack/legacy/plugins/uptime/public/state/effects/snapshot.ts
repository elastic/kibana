/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { takeLatest } from 'redux-saga/effects';
import {
  FETCH_SNAPSHOT_COUNT,
  fetchSnapshotCountFail,
  fetchSnapshotCountSuccess,
} from '../actions';
import { fetchSnapshotCount } from '../api';
import { fetchEffectFactory } from './fetch_effect';

export function* fetchSnapshotCountEffect() {
  yield takeLatest(
    FETCH_SNAPSHOT_COUNT,
    fetchEffectFactory(fetchSnapshotCount, fetchSnapshotCountSuccess, fetchSnapshotCountFail)
  );
}
