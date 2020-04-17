/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { takeLatest } from 'redux-saga/effects';
import { fetchRedirects } from '../api';
import { fetchEffectFactory } from './fetch_effect';
import { getRedirectsAction } from '../actions/redirects';

export function* fetchRedirectsEffect() {
  yield takeLatest(
    getRedirectsAction.get,
    fetchEffectFactory(fetchRedirects, getRedirectsAction.success, getRedirectsAction.fail)
  );
}
