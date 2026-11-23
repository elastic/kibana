/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsqlDataResult } from '@kbn/custom-content-renderer';

/** One of the panel's queries being edited. The id keeps its editor and preview with it when another is removed. */
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
  /** The queries being edited, the first of which is `rows` in the template. Never empty. */
  draftQueries: DraftQuery[];
  nextQueryId: number;
  draftTemplate: string;
  isRenderLoading: boolean;
  /** Why "Run preview" failed. Kept apart from the data preview of any one query. */
  renderError: string | null;
}

export type FlyoutAction =
  | { type: 'ADD_QUERY' }
  | { type: 'REMOVE_QUERY'; id: number }
  /** Changes some fields of one query: its text, or the state of its data preview. */
  | { type: 'PATCH_QUERY'; id: number; patch: Partial<Omit<DraftQuery, 'id'>> }
  | { type: 'SET_TEMPLATE'; payload: string }
  | { type: 'RENDER_START' }
  | { type: 'RENDER_DONE' }
  | { type: 'RENDER_ERROR'; payload: string };

const updateQuery = (
  state: FlyoutReducerState,
  id: number,
  update: Partial<DraftQuery>
): FlyoutReducerState => ({
  ...state,
  draftQueries: state.draftQueries.map((draft) =>
    draft.id === id ? { ...draft, ...update } : draft
  ),
});

export const flyoutReducer = (
  state: FlyoutReducerState,
  action: FlyoutAction
): FlyoutReducerState => {
  switch (action.type) {
    case 'ADD_QUERY':
      return {
        ...state,
        draftQueries: [...state.draftQueries, createDraftQuery(state.nextQueryId, '')],
        nextQueryId: state.nextQueryId + 1,
      };
    case 'REMOVE_QUERY':
      return {
        ...state,
        draftQueries: state.draftQueries.filter((draft) => draft.id !== action.id),
      };
    case 'PATCH_QUERY':
      return updateQuery(state, action.id, action.patch);
    case 'SET_TEMPLATE':
      return { ...state, draftTemplate: action.payload };
    case 'RENDER_START':
      return { ...state, isRenderLoading: true, renderError: null };
    case 'RENDER_DONE':
      return { ...state, isRenderLoading: false };
    case 'RENDER_ERROR':
      return { ...state, renderError: action.payload };
  }
};
