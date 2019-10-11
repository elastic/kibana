/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import produce from 'immer';
import { Action, handleActions } from 'redux-actions';

import { Repository } from '../../model';

import { loadRepo, loadRepoSuccess, loadRepoFailed } from '../actions';
import { routePathChange, repoChange } from '../actions/route';

export interface RepositoryState {
  repository?: Repository;
  repoNotFound: boolean;
}

const initialState: RepositoryState = {
  repoNotFound: false,
};

const clearState = (state: RepositoryState) =>
  produce<RepositoryState>(state, draft => {
    draft.repository = undefined;
    draft.repoNotFound = initialState.repoNotFound;
  });

export const repository = handleActions<RepositoryState, Repository>(
  {
    [String(loadRepo)]: state =>
      produce<RepositoryState>(state, draft => {
        draft.repository = undefined;
        draft.repoNotFound = false;
      }),
    [String(loadRepoSuccess)]: (state, action: Action<Repository>) =>
      produce<RepositoryState>(state, draft => {
        draft.repository = action.payload;
        draft.repoNotFound = false;
      }),
    [String(loadRepoFailed)]: state =>
      produce<RepositoryState>(state, draft => {
        draft.repository = undefined;
        draft.repoNotFound = true;
      }),
    [String(routePathChange)]: clearState,
    [String(repoChange)]: clearState,
  },
  initialState
);
