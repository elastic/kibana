/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import produce from 'immer';
import { handleActions, Action } from 'redux-actions';
import { Hover, TextDocumentPositionParams } from 'vscode-languageserver';
import {
  closeReferences,
  findReferences,
  findReferencesFailed,
  findReferencesSuccess,
  GroupedRepoReferences,
  hoverResult,
  revealPosition,
  ReferenceResults,
} from '../actions';

export interface EditorState {
  loading: boolean;
  showing: boolean;
  references: GroupedRepoReferences[];
  hover?: Hover;
  currentHover?: Hover;
  refPayload?: TextDocumentPositionParams;
  revealPosition?: Position;
  referencesTitle: string;
}
const initialState: EditorState = {
  loading: false,
  showing: false,
  references: [],
  referencesTitle: '',
};

type EditorPayload = ReferenceResults & Hover & TextDocumentPositionParams & Position & string;

export const editor = handleActions<EditorState, EditorPayload>(
  {
    [String(findReferences)]: (state, action: Action<TextDocumentPositionParams>) =>
      produce<EditorState>(state, draft => {
        draft.refPayload = action.payload;
        draft.showing = true;
        draft.loading = true;
        draft.references = initialState.references;
        draft.hover = state.currentHover;
        draft.referencesTitle = initialState.referencesTitle;
      }),
    [String(findReferencesSuccess)]: (state, action: any) =>
      produce<EditorState>(state, draft => {
        const { title, repos } = action.payload;
        draft.references = repos;
        draft.referencesTitle = title;
        draft.loading = false;
      }),
    [String(findReferencesFailed)]: state =>
      produce<EditorState>(state, draft => {
        draft.references = [];
        draft.loading = false;
        draft.refPayload = undefined;
      }),
    [String(closeReferences)]: state =>
      produce<EditorState>(state, draft => {
        draft.showing = false;
        draft.loading = false;
        draft.refPayload = undefined;
        draft.references = [];
      }),
    [String(hoverResult)]: (state, action: Action<Hover>) =>
      produce<EditorState>(state, draft => {
        draft.currentHover = action.payload;
      }),
    [String(revealPosition)]: (state, action: Action<Position>) =>
      produce<EditorState>(state, draft => {
        draft.revealPosition = action.payload;
      }),
  },
  initialState
);
