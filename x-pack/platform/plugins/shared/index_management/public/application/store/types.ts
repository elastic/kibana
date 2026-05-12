/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Query } from '@elastic/eui';
import type { AnyAction } from 'redux';
import type { ThunkDispatch } from 'redux-thunk';
import type { Error as EsUiError } from '@kbn/es-ui-shared-plugin/public';
import type { Index } from '../../../common';
import type { AppDependencies } from '../app_context';

export interface HttpError {
  status?: number;
  body?: EsUiError;
}

export interface IndicesState {
  byId: Record<string, Index>;
  allIds: string[];
  loading: boolean;
  error: false | HttpError;
  enrichmentErrors: string[];
}

export type RowStatusState = Record<string, string>;

export interface TableState {
  filter: string | Query;
  pageSize: number;
  currentPage: number;
  sortField: string;
  isSortAscending: boolean;
  toggleNameToVisibleMap: Record<string, boolean>;
}

export interface IndexManagementState {
  indices: IndicesState;
  rowStatus: RowStatusState;
  tableState: TableState;
}

export type AppDispatch = ThunkDispatch<
  IndexManagementState,
  AppDependencies['services'],
  AnyAction
>;
