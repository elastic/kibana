/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsqlDataResult } from '../utils/fetch_esql_data';

interface FlyoutReducerState {
  draftEsqlQuery: string;
  draftTemplate: string;
  isPreviewLoading: boolean;
  previewData: EsqlDataResult | null;
  previewError: string | null;
}

export type FlyoutAction =
  | { type: 'SET_ESQL_QUERY'; payload: string }
  | { type: 'SET_TEMPLATE'; payload: string }
  | { type: 'PREVIEW_START' }
  | { type: 'PREVIEW_SUCCESS'; payload: EsqlDataResult }
  | { type: 'PREVIEW_ERROR'; payload: string }
  | { type: 'PREVIEW_DONE' };

export const flyoutReducer = (
  state: FlyoutReducerState,
  action: FlyoutAction
): FlyoutReducerState => {
  switch (action.type) {
    case 'SET_ESQL_QUERY':
      return { ...state, draftEsqlQuery: action.payload };
    case 'SET_TEMPLATE':
      return { ...state, draftTemplate: action.payload };
    case 'PREVIEW_START':
      return { ...state, isPreviewLoading: true, previewError: null };
    case 'PREVIEW_SUCCESS':
      return { ...state, previewData: action.payload };
    case 'PREVIEW_ERROR':
      return { ...state, previewError: action.payload };
    case 'PREVIEW_DONE':
      return { ...state, isPreviewLoading: false };
  }
};
