/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { takeLatest } from 'redux-saga/effects';
import { fetchEffectFactory } from './fetch_effect';
import {
  getDynamicSettings,
  getDynamicSettingsSuccess,
  getDynamicSettingsFail,
} from '../actions/dynamic_settings';
import { fetchDynamicSettings } from '../api';

export function* fetchDynamicSettingsEffect() {
  yield takeLatest(
    String(getDynamicSettings),
    fetchEffectFactory(fetchDynamicSettings, getDynamicSettingsSuccess, getDynamicSettingsFail)
  );
}
