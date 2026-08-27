/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { combineReducers } from 'redux-v4';
import { indices } from './indices';
import { rowStatus } from './row_status';
import { getTableStateReducer } from './table_state';
import type { TableState } from '../types';

export const getReducer = (initialTableState?: TableState) =>
  combineReducers({
    indices,
    rowStatus,
    tableState: getTableStateReducer(initialTableState),
  });

export type IndexManagementAction = Parameters<ReturnType<typeof getReducer>>[1];
