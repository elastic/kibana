/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import produce from 'immer';
import { Action, handleActions } from 'redux-actions';

import { GitBlame } from '../../common/git_blame';
import { loadBlame, loadBlameFailed, loadBlameSuccess } from '../actions/blame';

export interface BlameState {
  blames: GitBlame[];
  loading: boolean;
  error?: Error;
}

const initialState: BlameState = {
  blames: [],
  loading: false,
};

export const blame = handleActions<BlameState, any>(
  {
    [String(loadBlame)]: (state: BlameState) =>
      produce<BlameState>(state, draft => {
        draft.loading = true;
      }),
    [String(loadBlameSuccess)]: (state: BlameState, action: Action<GitBlame[]>) =>
      produce<BlameState>(state, (draft: BlameState) => {
        draft.blames = action.payload!;
        draft.loading = false;
      }),
    [String(loadBlameFailed)]: (state: BlameState, action: Action<Error>) =>
      produce<BlameState>(state, draft => {
        draft.loading = false;
        draft.error = action.payload;
        draft.blames = [];
      }),
  },
  initialState
);
