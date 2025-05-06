/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep } from 'lodash';

import { CoreTheme } from '@kbn/core/public';
import { PieVisualizationState } from '../../../../common/types';
import { GeneralDatasourceStates } from '../../../state_management';

import { getRuntimeConverters } from './converters';

export function convertToRuntimeState(
  state: PieVisualizationState,
  theme: CoreTheme,
  datasourceStates?: Readonly<GeneralDatasourceStates>
): PieVisualizationState {
  return getRuntimeConverters(theme, datasourceStates).reduce(
    (newState, fn) => fn(newState),
    cloneDeep(state)
  );
}
