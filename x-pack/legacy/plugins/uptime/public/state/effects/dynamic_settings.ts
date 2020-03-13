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
  setDynamicSettings,
} from '../actions/dynamic_settings';
import {
  getDynamicSettings as getDynamicSettingsAPI,
  setDynamicSettings as setDynamicSettingsAPI,
} from '../api';
import { DynamicSettings } from '../../../common/runtime_types';
import { getBasePath } from '../selectors';
import { uptimeKibanaCore } from '../../uptime_app';

export function* fetchDynamicSettingsEffect() {
  yield takeLatest(
    String(getDynamicSettings),
    fetchEffectFactory(getDynamicSettingsAPI, getDynamicSettingsSuccess, getDynamicSettingsFail)
  );
}

export function* setDynamicSettingsEffect() {
  yield takeLatest(String(setDynamicSettings), function*(action: Action<DynamicSettings>) {
    try {
      if (!action.payload) {
        const err = new Error('Cannot fetch effect without a payload');
        yield put(setDynamicSettingsFail(err));
        yield uptimeKibanaCore?.notifications.toasts.addError(err, {
          title: 'Could not save settings!',
        });
        return;
      }
      const basePath = yield select(getBasePath);
      yield call(setDynamicSettingsAPI, { settings: action.payload, basePath });
      yield put(setDynamicSettingsSuccess(action.payload));
      yield uptimeKibanaCore?.notifications.toasts.addSuccess('Settings saved!');
    } catch (error) {
      yield uptimeKibanaCore?.notifications.toasts.addError(error, {
        title: 'Could not save settings!',
      });
      yield put(setDynamicSettingsFail(error));
    }
  });
}
