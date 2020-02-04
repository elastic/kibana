/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { takeLatest, put, call, select } from 'redux-saga/effects';
import { Action } from 'redux-actions';
import { fetchEffectFactory } from './fetch_effect';
import {
  getDynamicSettings,
  getDynamicSettingsSuccess,
  getDynamicSettingsFail,
  setDynamicSettingsSuccess,
  setDynamicSettingsFail,
} from '../actions/dynamic_settings';
import { fetchDynamicSettings, setDynamicSettings } from '../api';
import { DynamicSettings } from '../../../common/runtime_types';
import { getBasePath } from '../selectors';

export function* fetchDynamicSettingsEffect() {
  yield takeLatest(
    String(getDynamicSettings),
    fetchEffectFactory(fetchDynamicSettings, getDynamicSettingsSuccess, getDynamicSettingsFail)
  );
}

export function* setDynamicSettingsEffect() {
  yield takeLatest(String(setDynamicSettings), function*(action: Action<DynamicSettings>) {
    try {
      if (!action.payload) {
        yield put(
          setDynamicSettingsFail(new Error('Cannot fetch effect for undefined parameters'))
        );
        return;
      }
      const basePath = yield select(getBasePath);
      const response = yield call(setDynamicSettings, { settings: action.payload, basePath });
      yield put(setDynamicSettingsSuccess(response));
    } catch (error) {
      yield put(setDynamicSettingsFail(error));
    }
  });
}
