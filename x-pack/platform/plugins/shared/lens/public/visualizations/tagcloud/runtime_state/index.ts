/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep } from 'lodash';
import { FormBasedPersistedState } from '../../../datasources/form_based/types';
import { TagcloudState } from '../types';
import { getRuntimeConverters } from './converters';

export function convertToRuntimeState(
  state: TagcloudState,
  datasourceState?: FormBasedPersistedState
): TagcloudState {
  const clonedState = cloneDeep(state) as TagcloudState;
  return getRuntimeConverters(datasourceState).reduce((newState, fn) => fn(newState), clonedState);
}
