/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsqlDataResult } from '@kbn/custom-content-renderer';

/** A query after the main one. The id keeps its editor and preview with it when another is removed. */
export interface DraftQuery {
  id: number;
  text: string;
  isDataLoading: boolean;
  esqlData: EsqlDataResult | null;
  esqlDataError: string | null;
}

export const createDraftQuery = (id: number, text: string): DraftQuery => ({
  id,
  text,
  isDataLoading: false,
  esqlData: null,
  esqlDataError: null,
});

export interface FlyoutReducerState {
  draftEsqlQuery: string;
  additionalQueries: DraftQuery[];
  nextQueryId: number;
  draftTemplate: string;
  isDataLoading: boolean;
  esqlData: EsqlDataResult | null;
  esqlDataError: string | null;
  /** Why "Run preview" failed. Kept apart from the data preview of any one query. */
  renderError: string | null;
  isRenderLoading: boolean;
}

export type FlyoutAction =
  | { type: 'SET_ESQL_QUERY'; payload: string }
  | { type: 'SET_TEMPLATE'; payload: string }
  | { type: 'ADD_QUERY' }
  | { type: 'REMOVE_QUERY'; id: number }
  | { type: 'SET_QUERY_TEXT'; id: number; payload: string }
  | { type: 'FETCH_QUERY_START'; id: number }
  | { type: 'FETCH_QUERY_SUCCESS'; id: number; payload: EsqlDataResult }
  | { type: 'FETCH_QUERY_ERROR'; id: number; payload: string }
  | { type: 'FETCH_QUERY_DONE'; id: number }
  | { type: 'FETCH_DATA_START' }
  | { type: 'FETCH_DATA_SUCCESS'; payload: EsqlDataResult }
  | { type: 'FETCH_DATA_ERROR'; payload: string }
  | { type: 'FETCH_DATA_DONE' }
  | { type: 'RENDER_START' }
  | { type: 'RENDER_ERROR'; payload: string }
  | { type: 'RENDER_DONE' };

const updateQuery = (
  state: FlyoutReducerState,
  id: number,
  update: Partial<DraftQuery>
): FlyoutReducerState => ({
  ...state,
  additionalQueries: state.additionalQueries.map((draft) =>
    draft.id === id ? { ...draft, ...update } : draft
  ),
});

export const flyoutReducer = (
  state: FlyoutReducerState,
  action: FlyoutAction
): FlyoutReducerState => {
  switch (action.type) {
    case 'SET_ESQL_QUERY':
      return { ...state, draftEsqlQuery: action.payload };
    case 'SET_TEMPLATE':
      return { ...state, draftTemplate: action.payload };
    case 'ADD_QUERY':
      return {
        ...state,
        additionalQueries: [...state.additionalQueries, createDraftQuery(state.nextQueryId, '')],
        nextQueryId: state.nextQueryId + 1,
      };
    case 'REMOVE_QUERY':
      return {
        ...state,
        additionalQueries: state.additionalQueries.filter((draft) => draft.id !== action.id),
      };
    case 'SET_QUERY_TEXT':
      return updateQuery(state, action.id, { text: action.payload });
    case 'FETCH_QUERY_START':
      return updateQuery(state, action.id, {
        isDataLoading: true,
        esqlDataError: null,
        esqlData: null,
      });
    case 'FETCH_QUERY_SUCCESS':
      return updateQuery(state, action.id, { esqlData: action.payload });
    case 'FETCH_QUERY_ERROR':
      return updateQuery(state, action.id, { esqlDataError: action.payload, esqlData: null });
    case 'FETCH_QUERY_DONE':
      return updateQuery(state, action.id, { isDataLoading: false });
    case 'FETCH_DATA_START':
      return { ...state, isDataLoading: true, esqlDataError: null, esqlData: null };
    case 'FETCH_DATA_SUCCESS':
      return { ...state, esqlData: action.payload };
    case 'FETCH_DATA_ERROR':
      return { ...state, esqlDataError: action.payload, esqlData: null };
    case 'FETCH_DATA_DONE':
      return { ...state, isDataLoading: false };
    case 'RENDER_START':
      return { ...state, isRenderLoading: true, renderError: null };
    case 'RENDER_ERROR':
      return { ...state, renderError: action.payload };
    case 'RENDER_DONE':
      return { ...state, isRenderLoading: false };
  }
};
