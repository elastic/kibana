/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { takeLatest } from 'redux-saga/effects';
import {
  getMLCapabilitiesAction,
  getExistingMLJobAction,
  createMLJobAction,
  getAnomalyRecordsAction,
  deleteMLJobAction,
} from '../actions';
import { fetchEffectFactory } from './fetch_effect';
import {
  getExistingJobs,
  createMLJob,
  fetchAnomalyRecords,
  deleteMLJob,
  getMLCapabilities,
} from '../api/ml_anomaly';

export function* fetchMLJobEffect() {
  yield takeLatest(
    getExistingMLJobAction.get,
    fetchEffectFactory(getExistingJobs, getExistingMLJobAction.success, getExistingMLJobAction.fail)
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
  yield takeLatest(
    getMLCapabilitiesAction.get,
    fetchEffectFactory(
      getMLCapabilities,
      getMLCapabilitiesAction.success,
      getMLCapabilitiesAction.fail
    )
  );
}
