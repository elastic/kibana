/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import produce from 'immer';
import { handleActions, Action } from 'redux-actions';
import {
  fetchFileFailed,
  FetchFileResponse,
  fetchFileSuccess,
  routeChange,
  setNotFound,
  fetchFile,
  FetchFilePayload,
} from '../actions';
import { routePathChange, repoChange, revisionChange, filePathChange } from '../actions/route';

export interface FileState {
  file?: FetchFileResponse;
  isNotFound: boolean;
  loading: boolean;
}

const initialState: FileState = {
  isNotFound: false,
  loading: false,
};

const clearState = (state: FileState) =>
  produce<FileState>(state, draft => {
    draft.file = undefined;
    draft.isNotFound = initialState.isNotFound;
    draft.loading = initialState.loading;
  });

type FilePayload = FetchFileResponse & boolean & FetchFilePayload;

export const file = handleActions<FileState, FilePayload>(
  {
    [String(fetchFile)]: (state, action: Action<FetchFilePayload>) =>
      produce<FileState>(state, draft => {
        draft.loading = true;
      }),
    [String(fetchFileSuccess)]: (state, action: Action<FetchFileResponse>) =>
      produce<FileState>(state, draft => {
        draft.file = action.payload;
        draft.isNotFound = false;
        draft.loading = false;
      }),
    [String(fetchFileFailed)]: state =>
      produce<FileState>(state, draft => {
        draft.file = undefined;
        draft.loading = false;
      }),
    [String(setNotFound)]: (state, action: Action<boolean>) =>
      produce<FileState>(state, draft => {
        draft.isNotFound = action.payload!;
        draft.loading = false;
      }),
    [String(routeChange)]: state =>
      produce<FileState>(state, draft => {
        draft.isNotFound = false;
      }),
    [String(routePathChange)]: clearState,
    [String(repoChange)]: clearState,
    [String(revisionChange)]: clearState,
    [String(filePathChange)]: clearState,
  },
  initialState
);
