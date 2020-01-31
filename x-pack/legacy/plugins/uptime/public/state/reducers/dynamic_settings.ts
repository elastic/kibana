/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { handleActions, Action } from 'redux-actions';
import {
  getDynamicSettings,
  getDynamicSettingsSuccess,
  getDynamicSettingsFail,
} from '../actions/dynamic_settings';
import { DynamicSettings } from '../../../common/runtime_types';

export interface DynamicSettingsState {
  settings?: DynamicSettings;
  loading: boolean;
}

const initialState: DynamicSettingsState = {
  loading: true,
};

type DynamicSettingsPayload = DynamicSettings;

export const dynamicSettingsReducer = handleActions<DynamicSettingsState, DynamicSettingsPayload>(
  {
    [String(getDynamicSettings)]: state => ({
      ...state,
      loading: true,
    }),
    [String(getDynamicSettingsSuccess)]: (state, action: Action<DynamicSettings>) => {
      return {
        loading: false,
        settings: action.payload,
      };
    },
    [String(getDynamicSettingsFail)]: (state, action: Action<DynamicSettings>) => {
      return {
        loading: false,
        settings: action.payload,
      };
    },
  },
  initialState
);
