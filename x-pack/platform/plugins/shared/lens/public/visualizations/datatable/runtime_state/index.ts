/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FormBasedPersistedState } from '../../../datasources/form_based/types';
import { DatatableVisualizationState } from '../datatable_visualization';
import { getRuntimeConverters } from './converters';

export function convertToRuntimeState(
  state: DatatableVisualizationState,
  datasourceState?: FormBasedPersistedState
): DatatableVisualizationState {
  return getRuntimeConverters(datasourceState).reduce((newState, fn) => fn(newState), state);
}
