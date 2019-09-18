/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { takeLatest, select } from 'redux-saga/effects';
import actionCreatorFactory, { Action } from 'typescript-fsa';
import { GraphStoreDependencies } from './store';
import { loadFields, selectedFieldsSelector, updateFieldProperties } from './fields';
import { InferActionType } from '../types';
import { reducerWithInitialState } from 'typescript-fsa-reducers';
import { reset } from './global';

const actionCreator = actionCreatorFactory('x-pack/graph/metaData');

export type MetaDataState = {
  title: string;
  description: string;
};

export const updateMetaData = actionCreator<MetaDataState>('UPDATE_META_DATA');

const initialMetaData: MetaDataState = {
  // TODO I18n
  title: 'Unsaved workspace',
  description: ''
};

export const metaDataReducer = reducerWithInitialState(initialMetaData)
  .case(reset, () => initialMetaData)
  .case(updateMetaData, (_oldMetaData, newMetaData) => newMetaData)
  .build();