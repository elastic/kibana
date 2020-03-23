/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { takeLatest } from 'redux-saga/effects';
import { getIndexPattern, getIndexPatternSuccess, getIndexPatternFail } from '../actions';
import { fetchIndexPattern } from '../api';
import { fetchEffectFactory } from './fetch_effect';

export function* fetchIndexPatternEffect() {
  yield takeLatest(
    getIndexPattern,
    fetchEffectFactory(fetchIndexPattern, getIndexPatternSuccess, getIndexPatternFail)
  );
}
