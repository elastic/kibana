/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { fork } from 'redux-saga/effects';
import { fetchMonitorDetailsEffect } from './monitor';
import { fetchOverviewFiltersEffect } from './overview_filters';
import { fetchSnapshotCountEffect } from './snapshot';

export function* rootEffect() {
  yield fork(fetchMonitorDetailsEffect);
  yield fork(fetchSnapshotCountEffect);
  yield fork(fetchOverviewFiltersEffect);
}
