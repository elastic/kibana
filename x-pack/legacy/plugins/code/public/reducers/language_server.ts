/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import produce from 'immer';
import { Action, handleActions } from 'redux-actions';

import { LanguageServer, LanguageServerStatus } from '../../common/language_server';
import {
  loadLanguageServers,
  loadLanguageServersFailed,
  loadLanguageServersSuccess,
  requestInstallLanguageServer,
  requestInstallLanguageServerSuccess,
} from '../actions/language_server';

export interface LanguageServerState {
  languageServers: LanguageServer[];
  loading: boolean;
  installServerLoading: { [ls: string]: boolean };
}

const initialState: LanguageServerState = {
  languageServers: [],
  loading: false,
  installServerLoading: {},
};

type LanguageServerPayload = string & LanguageServer[];

export const languageServer = handleActions<LanguageServerState, LanguageServerPayload>(
  {
    [String(loadLanguageServers)]: state =>
      produce<LanguageServerState>(state, draft => {
        draft.loading = true;
      }),
    [String(loadLanguageServersSuccess)]: (
      state: LanguageServerState,
      action: Action<LanguageServer[]>
    ) =>
      produce<LanguageServerState>(state, draft => {
        draft.languageServers = action.payload!;
        draft.loading = false;
      }),
    [String(loadLanguageServersFailed)]: state =>
      produce<LanguageServerState>(state, draft => {
        draft.languageServers = [];
        draft.loading = false;
      }),
    [String(requestInstallLanguageServer)]: (state, action: Action<string>) =>
      produce<LanguageServerState>(state, draft => {
        draft.installServerLoading[action.payload!] = true;
      }),
    [String(requestInstallLanguageServerSuccess)]: (
      state: LanguageServerState,
      action: Action<string>
    ) =>
      produce<LanguageServerState>(state, draft => {
        draft.installServerLoading[action.payload!] = false;
        draft.languageServers.find(ls => ls.name === action.payload)!.status =
          LanguageServerStatus.READY;
      }),
  },
  initialState
);
