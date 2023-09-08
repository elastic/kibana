/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnyAction, CombinedState, Reducer } from 'redux';
import * as dataTableActions from './actions';
import * as dataTableSelectors from './selectors';
import type { TableState } from './types';

export { dataTableActions, dataTableSelectors };

export interface DataTableReducer {
  dataTable: Reducer<CombinedState<TableState>, AnyAction>;
}
