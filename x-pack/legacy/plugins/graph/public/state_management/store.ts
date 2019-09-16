/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { combineReducers, createStore, Store, AnyAction, Dispatch } from 'redux';
import { fieldsReducer, FieldsState } from './fields';
import { UrlTemplatesState, urlTemplatesReducer } from './url_templates';
import { AdvancedSettingsState, advancedSettingsReducer } from './advanced_settings';

export interface GraphState {
  fields: FieldsState;
  urlTemplates: UrlTemplatesState;
  advancedSettings: AdvancedSettingsState;
}

const rootReducer = combineReducers({
  fields: fieldsReducer,
  urlTemplates: urlTemplatesReducer,
  advancedSettings: advancedSettingsReducer,
});

export const createGraphStore = () => createStore(rootReducer);

export type GraphStore = Store<GraphState, AnyAction>;
export type GraphDispatch = Dispatch<AnyAction>;
