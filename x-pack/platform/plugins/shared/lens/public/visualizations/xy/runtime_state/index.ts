/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GeneralDatasourceStates } from '../../../state_management';
import { XYState } from '../types';
import { getRuntimeConverters } from './converters';

export function convertToRuntimeState(
  state: XYState,
  datasourceStates?: Readonly<GeneralDatasourceStates>
): XYState {
  return getRuntimeConverters(datasourceStates).reduce(
    (newState, fn) => fn(newState),
    structuredClone(state)
  );
}
