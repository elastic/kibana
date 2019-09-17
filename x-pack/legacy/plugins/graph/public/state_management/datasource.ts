/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import actionCreatorFactory from 'typescript-fsa';
import { reducerWithInitialState } from 'typescript-fsa-reducers/dist';
import { GraphState } from './store';
import { reset } from './global';

const actionCreator = actionCreatorFactory('x-pack/graph/datasource');

export interface NoDatasource {
  type: 'none';
}
export interface IndexpatternDatasource {
  type: 'indexpattern';
  id: string;
  title: string;
}

export type DatasourceState = NoDatasource | IndexpatternDatasource;

export const setDatasource = actionCreator<DatasourceState>('SET_DATASOURCE');

const initialDatasource: DatasourceState = {
  type: 'none',
};

export const datasourceReducer = reducerWithInitialState<DatasourceState>(initialDatasource)
  .case(reset, () => initialDatasource)
  .case(setDatasource, (_oldDatasource, newDatasource) => newDatasource)
  .build();

export const datasourceSelector = (state: GraphState) => state.datasource;
