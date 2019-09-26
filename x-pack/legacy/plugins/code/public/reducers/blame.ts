/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import produce from 'immer';
import { Action, handleActions } from 'redux-actions';

import { GitBlame } from '../../common/git_blame';
import { loadBlame, loadBlameFailed, loadBlameSuccess } from '../actions/blame';
import { routePathChange, repoChange, revisionChange, filePathChange } from '../actions/route';

export interface BlameState {
  blames: GitBlame[];
  loading: boolean;
  error?: Error;
}

const initialState: BlameState = {
  blames: [],
  loading: false,
};

const clearState = (state: BlameState) =>
  produce<BlameState>(state, draft => {
    draft.blames = initialState.blames;
    draft.loading = initialState.loading;
    draft.error = undefined;
  });

type BlameStatePayload = GitBlame[] & Error;

export const blame = handleActions<BlameState, BlameStatePayload>(
  {
    [String(loadBlame)]: state =>
      produce<BlameState>(state, draft => {
        draft.loading = true;
      }),
    [String(loadBlameSuccess)]: (state, action: Action<GitBlame[]>) =>
      produce<BlameState>(state, draft => {
        draft.blames = action.payload!;
        draft.loading = false;
      }),
    [String(loadBlameFailed)]: (state, action: Action<Error>) =>
      produce<BlameState>(state, draft => {
        draft.loading = false;
        draft.error = action.payload;
        draft.blames = [];
      }),
    [String(routePathChange)]: clearState,
    [String(repoChange)]: clearState,
    [String(revisionChange)]: clearState,
    [String(filePathChange)]: clearState,
  },
  initialState
);
