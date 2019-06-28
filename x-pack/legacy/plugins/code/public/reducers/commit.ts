/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import produce from 'immer';
import { Action, handleActions } from 'redux-actions';

import { AnyAction } from 'redux';
import { CommitDiff } from '../../common/git_diff';
import { loadCommit, loadCommitFailed, loadCommitSuccess } from '../actions/commit';

export interface CommitState {
  commit: CommitDiff | null;
  loading: boolean;
}

const initialState: CommitState = {
  commit: null,
  loading: false,
};

export const commit = handleActions<CommitState, AnyAction>(
  {
    [String(loadCommit)]: (state: CommitState, action: Action<any>) =>
      produce<CommitState>(state, draft => {
        draft.loading = true;
      }),
    [String(loadCommitSuccess)]: (state: CommitState, action: Action<any>) =>
      produce<CommitState>(state, draft => {
        draft.commit = action.payload;
        draft.loading = false;
      }),
    [String(loadCommitFailed)]: (state: CommitState, action: Action<any>) =>
      produce<CommitState>(state, draft => {
        draft.commit = null;
        draft.loading = false;
      }),
  },
  initialState
);
