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
} from '../actions';
import { routePathChange, repoChange, revisionChange, filePathChange } from '../actions/route';

export interface FileState {
  file?: FetchFileResponse;
  isNotFound: boolean;
}

const initialState: FileState = {
  isNotFound: false,
};

const clearState = (state: FileState) =>
  produce<FileState>(state, draft => {
    draft.file = undefined;
    draft.isNotFound = initialState.isNotFound;
  });

type FilePayload = FetchFileResponse & boolean;

export const file = handleActions<FileState, FilePayload>(
  {
    [String(fetchFileSuccess)]: (state, action: Action<FetchFileResponse>) =>
      produce<FileState>(state, draft => {
        draft.file = action.payload;
        draft.isNotFound = false;
      }),
    [String(fetchFileFailed)]: state =>
      produce<FileState>(state, draft => {
        draft.file = undefined;
      }),
    [String(setNotFound)]: (state, action: Action<boolean>) =>
      produce<FileState>(state, draft => {
        draft.isNotFound = action.payload!;
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
