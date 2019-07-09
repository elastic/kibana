/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { combineReducers } from 'redux';
import { reducerWithInitialState } from 'typescript-fsa-reducers';

import {
  InfraSnapshotMetricInput,
  InfraSnapshotMetricType,
  InfraNodeType,
  InfraSnapshotGroupbyInput,
} from '../../../graphql/types';
import { InfraGroupByOptions, InfraWaffleMapBounds } from '../../../lib/lib';
import {
  changeAutoBounds,
  changeBoundsOverride,
  changeCustomOptions,
  changeGroupBy,
  changeMetric,
  changeNodeType,
  changeView,
} from './actions';

export interface WaffleOptionsState {
  metric: InfraSnapshotMetricInput;
  groupBy: InfraSnapshotGroupbyInput[];
  nodeType: InfraNodeType;
  view: string;
  customOptions: InfraGroupByOptions[];
  boundsOverride: InfraWaffleMapBounds;
  autoBounds: boolean;
}

export const initialWaffleOptionsState: WaffleOptionsState = {
  metric: { type: InfraSnapshotMetricType.cpu },
  groupBy: [],
  nodeType: InfraNodeType.host,
  view: 'map',
  customOptions: [],
  boundsOverride: { max: 1, min: 0 },
  autoBounds: true,
};

const currentMetricReducer = reducerWithInitialState(initialWaffleOptionsState.metric).case(
  changeMetric,
  (current, target) => target
);

const currentCustomOptionsReducer = reducerWithInitialState(
  initialWaffleOptionsState.customOptions
).case(changeCustomOptions, (current, target) => target);

const currentGroupByReducer = reducerWithInitialState(initialWaffleOptionsState.groupBy).case(
  changeGroupBy,
  (current, target) => target
);

const currentNodeTypeReducer = reducerWithInitialState(initialWaffleOptionsState.nodeType).case(
  changeNodeType,
  (current, target) => target
);

const currentViewReducer = reducerWithInitialState(initialWaffleOptionsState.view).case(
  changeView,
  (current, target) => target
);

const currentBoundsOverrideReducer = reducerWithInitialState(
  initialWaffleOptionsState.boundsOverride
).case(changeBoundsOverride, (current, target) => target);

const currentAutoBoundsReducer = reducerWithInitialState(initialWaffleOptionsState.autoBounds).case(
  changeAutoBounds,
  (current, target) => target
);

export const waffleOptionsReducer = combineReducers<WaffleOptionsState>({
  metric: currentMetricReducer,
  groupBy: currentGroupByReducer,
  nodeType: currentNodeTypeReducer,
  view: currentViewReducer,
  customOptions: currentCustomOptionsReducer,
  boundsOverride: currentBoundsOverrideReducer,
  autoBounds: currentAutoBoundsReducer,
});
