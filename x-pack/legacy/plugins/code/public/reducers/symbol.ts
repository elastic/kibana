/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import produce from 'immer';
import _ from 'lodash';
import { Action, handleActions } from 'redux-actions';

import { SymbolInformation } from 'vscode-languageserver-types/lib/esm/main';
import {
  closeSymbolPath,
  loadStructure,
  loadStructureFailed,
  loadStructureSuccess,
  openSymbolPath,
  SymbolsPayload,
} from '../actions';
import { languageServerInitializing } from '../actions/language_server';

export interface SymbolWithMembers extends SymbolInformation {
  members?: SymbolWithMembers[];
  path?: string;
}

export interface SymbolState {
  symbols: { [key: string]: SymbolInformation[] };
  structureTree: { [key: string]: SymbolWithMembers[] };
  error?: Error;
  loading: boolean;
  lastRequestPath?: string;
  closedPaths: string[];
  languageServerInitializing: boolean;
}

const initialState: SymbolState = {
  symbols: {},
  loading: false,
  structureTree: {},
  closedPaths: [],
  languageServerInitializing: false,
};

export const symbol = handleActions(
  {
    [String(loadStructure)]: (state: SymbolState, action: Action<any>) =>
      produce<SymbolState>(state, draft => {
        draft.loading = true;
        draft.lastRequestPath = action.payload || '';
      }),
    [String(loadStructureSuccess)]: (state: SymbolState, action: Action<SymbolsPayload>) =>
      produce<SymbolState>(state, (draft: SymbolState) => {
        draft.loading = false;
        const { path, data, structureTree } = action.payload!;
        draft.structureTree[path] = structureTree;
        draft.symbols = {
          ...state.symbols,
          [path]: data,
        };
        draft.languageServerInitializing = false;
        draft.error = undefined;
      }),
    [String(loadStructureFailed)]: (state: SymbolState, action: Action<any>) =>
      produce<SymbolState>(state, draft => {
        if (action.payload) {
          draft.loading = false;
          draft.error = action.payload;
        }
        draft.languageServerInitializing = false;
      }),
    [String(closeSymbolPath)]: (state: SymbolState, action: Action<any>) =>
      produce<SymbolState>(state, (draft: SymbolState) => {
        const path = action.payload!;
        if (!state.closedPaths.includes(path)) {
          draft.closedPaths.push(path);
        }
      }),
    [String(openSymbolPath)]: (state: SymbolState, action: any) =>
      produce<SymbolState>(state, draft => {
        const idx = state.closedPaths.indexOf(action.payload!);
        if (idx >= 0) {
          draft.closedPaths.splice(idx, 1);
        }
      }),
    [String(languageServerInitializing)]: (state: SymbolState) =>
      produce<SymbolState>(state, draft => {
        draft.languageServerInitializing = true;
      }),
  },
  initialState
);
