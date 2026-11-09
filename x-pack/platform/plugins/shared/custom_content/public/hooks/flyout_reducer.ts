/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsqlDataResult } from '@kbn/custom-content-renderer';

interface FlyoutReducerState {
  draftEsqlQuery: string;
  draftTemplate: string;
  isDataLoading: boolean;
  esqlData: EsqlDataResult | null;
  esqlDataError: string | null;
  isRenderLoading: boolean;
}

export type FlyoutAction =
  | { type: 'SET_ESQL_QUERY'; payload: string }
  | { type: 'SET_TEMPLATE'; payload: string }
  | { type: 'FETCH_DATA_START' }
  | { type: 'FETCH_DATA_SUCCESS'; payload: EsqlDataResult }
  | { type: 'FETCH_DATA_ERROR'; payload: string }
  | { type: 'FETCH_DATA_DONE' }
  | { type: 'RENDER_START' }
  | { type: 'RENDER_DONE' };

export const flyoutReducer = (
  state: FlyoutReducerState,
  action: FlyoutAction
): FlyoutReducerState => {
  switch (action.type) {
    case 'SET_ESQL_QUERY':
      return { ...state, draftEsqlQuery: action.payload };
    case 'SET_TEMPLATE':
      return { ...state, draftTemplate: action.payload };
    case 'FETCH_DATA_START':
      return { ...state, isDataLoading: true, esqlDataError: null, esqlData: null };
    case 'FETCH_DATA_SUCCESS':
      return { ...state, esqlData: action.payload };
    case 'FETCH_DATA_ERROR':
      return { ...state, esqlDataError: action.payload, esqlData: null };
    case 'FETCH_DATA_DONE':
      return { ...state, isDataLoading: false };
    case 'RENDER_START':
      return { ...state, isRenderLoading: true, esqlDataError: null };
    case 'RENDER_DONE':
      return { ...state, isRenderLoading: false };
  }
};
