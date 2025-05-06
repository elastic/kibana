/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreTheme } from '@kbn/core/public';
import { GeneralDatasourceStates } from '../../../state_management';
import { DatatableVisualizationState } from '../datatable_visualization';
import { getRuntimeConverters } from './converters';

export function convertToRuntimeState(
  state: DatatableVisualizationState,
  theme: CoreTheme,
  datasourceStates?: Readonly<GeneralDatasourceStates>
): DatatableVisualizationState {
  return getRuntimeConverters(theme, datasourceStates).reduce(
    (newState, fn) => fn(newState),
    state
  );
}
