/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import produce from 'immer';
import { handleActions, Action } from 'redux-actions';
import { Hover, TextDocumentPositionParams } from 'vscode-languageserver';
import {
  closePanel,
  findReferences,
  findReferencesFailed,
  findReferencesSuccess,
  GroupedRepoResults,
  hoverResult,
  revealPosition,
  PanelResults,
  findDefinitions,
  findDefinitionsSuccess,
  findDefinitionsFailed,
} from '../actions';

export interface EditorState {
  loading: boolean;
  panelShowing: 'references' | 'definitions' | undefined;
  panelContents: GroupedRepoResults[];
  hover?: Hover;
  currentHover?: Hover;
  refPayload?: TextDocumentPositionParams;
  revealPosition?: Position;
  panelTitle: string;
}
const initialState: EditorState = {
  loading: false,
  panelShowing: undefined,
  panelContents: [],
  panelTitle: '',
};

type EditorPayload = PanelResults & Hover & TextDocumentPositionParams & Position & string;

function panelInit(draft: EditorState, action: Action<TextDocumentPositionParams>) {
  draft.refPayload = action.payload!;
  draft.loading = true;
  draft.panelContents = initialState.panelContents;
  draft.panelTitle = initialState.panelTitle;
}

function panelSuccess(draft: EditorState, action: Action<PanelResults>) {
  const { title, repos } = action.payload!;
  draft.panelContents = repos;
  draft.panelTitle = title;
  draft.loading = false;
}
function panelFailed(draft: EditorState) {
  draft.panelContents = [];
  draft.loading = false;
  delete draft.refPayload;
}

export const editor = handleActions<EditorState, EditorPayload>(
  {
    [String(findReferences)]: (state, action: Action<TextDocumentPositionParams>) =>
      produce<EditorState>(state, (draft: EditorState) => {
        panelInit(draft, action);
        draft.panelShowing = 'references';
      }),
    [String(findReferencesSuccess)]: (state, action: Action<PanelResults>) =>
      produce<EditorState>(state, (draft: EditorState) => {
        panelSuccess(draft, action);
      }),
    [String(findReferencesFailed)]: state =>
      produce<EditorState>(state, (draft: EditorState) => {
        panelFailed(draft);
      }),
    [String(findDefinitions)]: (state, action: Action<TextDocumentPositionParams>) =>
      produce<EditorState>(state, (draft: EditorState) => {
        panelInit(draft, action);
        draft.panelShowing = 'definitions';
      }),
    [String(findDefinitionsSuccess)]: (state, action: Action<PanelResults>) =>
      produce<EditorState>(state, (draft: EditorState) => {
        panelSuccess(draft, action);
      }),
    [String(findDefinitionsFailed)]: state =>
      produce<EditorState>(state, (draft: EditorState) => {
        panelFailed(draft);
      }),
    [String(closePanel)]: state =>
      produce<EditorState>(state, (draft: EditorState) => {
        draft.panelShowing = undefined;
        draft.loading = false;
        delete draft.refPayload;
        draft.panelContents = [];
        draft.panelTitle = '';
      }),
    [String(hoverResult)]: (state, action: Action<Hover>) =>
      produce<EditorState>(state, (draft: EditorState) => {
        draft.currentHover = action.payload!;
      }),
    [String(revealPosition)]: (state, action: Action<Position>) =>
      produce<EditorState>(state, (draft: EditorState) => {
        draft.revealPosition = action.payload!;
      }),
  },
  initialState
);
