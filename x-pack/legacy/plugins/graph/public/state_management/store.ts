/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { combineReducers, createStore, Store, AnyAction, Dispatch } from 'redux';
import { fieldsReducer, FieldsState } from './fields';
import { UrlTemplatesState, urlTemplatesReducer } from './url_templates';
import { AdvancedSettingsState, advancedSettingsReducer } from './advanced_settings';
import { DatasourceState, datasourceReducer } from './datasource';

export interface GraphState {
  fields: FieldsState;
  urlTemplates: UrlTemplatesState;
  advancedSettings: AdvancedSettingsState;
  datasource: DatasourceState;
}

export interface GraphStoreDependencies {
  basePath: string;
}

export const createGraphStore = ({ basePath }: GraphStoreDependencies) => {
  const rootReducer = combineReducers({
    fields: fieldsReducer,
    urlTemplates: urlTemplatesReducer(basePath),
    advancedSettings: advancedSettingsReducer,
    datasource: datasourceReducer,
  });
  return createStore(rootReducer);
};

export type GraphStore = Store<GraphState, AnyAction>;
export type GraphDispatch = Dispatch<AnyAction>;
