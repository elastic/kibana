/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import actionCreatorFactory from 'typescript-fsa';
import { reducerWithInitialState } from 'typescript-fsa-reducers';
import { GraphState } from './store';
import { reset } from './global';

const actionCreator = actionCreatorFactory('x-pack/graph/metaData');

export interface MetaDataState {
  title: string;
  description: string;
  savedObjectId?: string;
}

export const updateMetaData = actionCreator<Partial<MetaDataState>>('UPDATE_META_DATA');

const initialMetaData: MetaDataState = {
  // TODO I18n
  title: 'Unsaved workspace',
  description: '',
};

export const metaDataReducer = reducerWithInitialState(initialMetaData)
  .case(reset, () => initialMetaData)
  .case(updateMetaData, (oldMetaData, newMetaData) => ({ ...oldMetaData, ...newMetaData }))
  .build();

export const metaDataSelector = (state: GraphState) => state.metaData;
