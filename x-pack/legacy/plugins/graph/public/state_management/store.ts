/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { combineReducers, createStore, Store, AnyAction, Dispatch } from 'redux';
import { fieldsReducer, FieldsState } from './fields';

export interface GraphState {
  fields: FieldsState;
}

const rootReducer = combineReducers({ fields: fieldsReducer });

export const createGraphStore = () => createStore(rootReducer);

export type GraphStore = Store<GraphState, AnyAction>;
export type GraphDispatch = Dispatch<AnyAction>;
