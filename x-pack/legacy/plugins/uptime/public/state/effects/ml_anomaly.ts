/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { takeLatest } from 'redux-saga/effects';
import {
  getMLJobAction,
  createMLJobAction,
  getAnomalyRecordsAction,
  deleteMLJobAction,
} from '../actions';
import { fetchEffectFactory } from './fetch_effect';
import { fetchMLJob, createMLJob, fetchAnomalyRecords, deleteMLJob } from '../api/ml_anomaly';

export function* fetchMLJobEffect() {
  yield takeLatest(
    getMLJobAction.get,
    fetchEffectFactory(fetchMLJob, getMLJobAction.success, getMLJobAction.fail)
  );
  yield takeLatest(
    createMLJobAction.get,
    fetchEffectFactory(createMLJob, createMLJobAction.success, createMLJobAction.fail)
  );
  yield takeLatest(
    getAnomalyRecordsAction.get,
    fetchEffectFactory(
      fetchAnomalyRecords,
      getAnomalyRecordsAction.success,
      getAnomalyRecordsAction.fail
    )
  );
  yield takeLatest(
    deleteMLJobAction.get,
    fetchEffectFactory(deleteMLJob, deleteMLJobAction.success, deleteMLJobAction.fail)
  );
}
