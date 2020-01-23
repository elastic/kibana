/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import actionCreatorFactory, { Action } from 'typescript-fsa';
import { reducerWithInitialState } from 'typescript-fsa-reducers/dist';
import { takeLatest } from 'redux-saga/effects';
import { GraphState, GraphStoreDependencies } from './store';
import { AdvancedSettings } from '../types';
import { reset } from './global';
import { setDatasource, requestDatasource } from './datasource';

const actionCreator = actionCreatorFactory('x-pack/graph/advancedSettings');

export type AdvancedSettingsState = AdvancedSettings;

export const updateSettings = actionCreator<AdvancedSettingsState>('UPDATE_SETTINGS');

const initialSettings: AdvancedSettingsState = {
  useSignificance: true,
  sampleSize: 2000,
  timeoutMillis: 5000,
  sampleDiversityField: undefined,
  maxValuesPerDoc: 1,
  minDocCount: 3,
};

export const advancedSettingsReducer = reducerWithInitialState(initialSettings)
  .case(reset, () => initialSettings)
  .cases([requestDatasource, setDatasource], ({ sampleDiversityField, ...restSettings }) => ({
    ...restSettings,
  }))
  .case(updateSettings, (_oldSettings, newSettings) => newSettings)
  .build();

export const settingsSelector = (state: GraphState) => state.advancedSettings;

/**
 * Saga making sure the advanced settings are always synced up to the workspace instance.
 *
 * Won't be necessary once the workspace is moved to redux
 */
export const syncSettingsSaga = ({ getWorkspace, notifyAngular }: GraphStoreDependencies) => {
  function* syncSettings(action: Action<AdvancedSettingsState>): IterableIterator<void> {
    const workspace = getWorkspace();
    if (!workspace) {
      return;
    }
    workspace.options.exploreControls = action.payload;
    notifyAngular();
  }

  return function*() {
    yield takeLatest(updateSettings.match, syncSettings);
  };
};
