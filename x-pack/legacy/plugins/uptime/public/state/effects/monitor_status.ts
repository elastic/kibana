/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { takeLatest } from 'redux-saga/effects';
import {
  getSelectedMonitorAction,
  getSelectedMonitorActionSuccess,
  getSelectedMonitorActionFail,
  getMonitorStatusAction,
  getMonitorStatusActionSuccess,
  getMonitorStatusActionFail,
} from '../actions';
import { fetchSelectedMonitor, fetchMonitorStatus } from '../api';
import { fetchEffectFactory } from './fetch_effect';

export function* fetchMonitorStatusEffect() {
  yield takeLatest(
    getMonitorStatusAction,
    fetchEffectFactory(
      fetchMonitorStatus,
      getMonitorStatusActionSuccess,
      getMonitorStatusActionFail
    )
  );

  yield takeLatest(
    getSelectedMonitorAction,
    fetchEffectFactory(
      fetchSelectedMonitor,
      getSelectedMonitorActionSuccess,
      getSelectedMonitorActionFail
    )
  );
}
