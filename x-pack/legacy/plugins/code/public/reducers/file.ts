/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import produce from 'immer';
import { handleActions } from 'redux-actions';
import {
  fetchFileFailed,
  FetchFileResponse,
  fetchFileSuccess,
  routeChange,
  setNotFound,
} from '../actions';

export interface FileState {
  file?: FetchFileResponse;
  isNotFound: boolean;
}

const initialState: FileState = {
  isNotFound: false,
};

export const file = handleActions(
  {
    [String(fetchFileSuccess)]: (state: FileState, action: any) =>
      produce<FileState>(state, draft => {
        draft.file = action.payload as FetchFileResponse;
        draft.isNotFound = false;
      }),
    [String(fetchFileFailed)]: (state: FileState, action: any) =>
      produce<FileState>(state, draft => {
        draft.file = undefined;
      }),
    [String(setNotFound)]: (state: FileState, action: any) =>
      produce<FileState>(state, draft => {
        draft.isNotFound = action.payload;
      }),
    [String(routeChange)]: (state: FileState, action: any) =>
      produce<FileState>(state, draft => {
        draft.isNotFound = false;
      }),
  },
  initialState
);
