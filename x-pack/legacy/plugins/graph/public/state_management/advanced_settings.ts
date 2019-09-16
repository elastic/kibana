/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import actionCreatorFactory from 'typescript-fsa';
import { reducerWithInitialState } from 'typescript-fsa-reducers/dist';
import { GraphState } from './store';
import { AdvancedSettings } from '../types';
import { reset } from './global';

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
  .case(updateSettings, (_oldSettings, newSettings) => newSettings)
  .build();

export const settingsSelector = (state: GraphState) => state.urlTemplates;
