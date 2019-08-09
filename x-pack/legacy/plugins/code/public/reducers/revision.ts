/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import produce from 'immer';
import { handleActions, Action } from 'redux-actions';
import { CommitInfo, ReferenceInfo, ReferenceType } from '../../model/commit';
import {
  fetchMoreCommits,
  fetchRepoBranchesSuccess,
  fetchRepoCommitsSuccess,
  fetchTreeCommits,
  fetchTreeCommitsFailed,
  fetchTreeCommitsSuccess,
  TreeCommitPayload,
} from '../actions';
import { routePathChange, repoChange } from '../actions/route';

export interface RevisionState {
  branches: ReferenceInfo[];
  tags: ReferenceInfo[];
  treeCommits: { [path: string]: CommitInfo[] };
  loadingCommits: boolean;
  commitsFullyLoaded: { [path: string]: boolean };
}

const initialState: RevisionState = {
  branches: [],
  tags: [],
  treeCommits: {},
  loadingCommits: false,
  commitsFullyLoaded: {},
};

const clearState = (state: RevisionState) =>
  produce<RevisionState>(state, draft => {
    draft.branches = initialState.branches;
    draft.tags = initialState.tags;
    draft.treeCommits = initialState.treeCommits;
    draft.loadingCommits = initialState.loadingCommits;
    draft.commitsFullyLoaded = initialState.commitsFullyLoaded;
  });

type RevisionPayload = ReferenceInfo[] & CommitInfo[] & TreeCommitPayload;

export const revision = handleActions<RevisionState, RevisionPayload>(
  {
    [String(fetchRepoCommitsSuccess)]: (state, action: Action<CommitInfo[]>) =>
      produce<RevisionState>(state, draft => {
        draft.treeCommits[''] = action.payload!;
        draft.loadingCommits = false;
      }),
    [String(fetchMoreCommits)]: state =>
      produce<RevisionState>(state, draft => {
        draft.loadingCommits = true;
      }),
    [String(fetchRepoBranchesSuccess)]: (state, action: Action<ReferenceInfo[]>) =>
      produce<RevisionState>(state, draft => {
        const references = action.payload!;
        draft.tags = references.filter(r => r.type === ReferenceType.TAG);
        draft.branches = references.filter(r => r.type !== ReferenceType.TAG);
      }),
    [String(fetchTreeCommits)]: state =>
      produce<RevisionState>(state, draft => {
        draft.loadingCommits = true;
      }),
    [String(fetchTreeCommitsFailed)]: state =>
      produce<RevisionState>(state, draft => {
        draft.loadingCommits = false;
      }),
    [String(fetchTreeCommitsSuccess)]: (state, action: Action<TreeCommitPayload>) =>
      produce<RevisionState>(state, draft => {
        const { path, commits, append } = action.payload!;
        if (commits.length === 0) {
          draft.commitsFullyLoaded[path] = true;
        } else if (append) {
          draft.treeCommits[path] = draft.treeCommits[path].concat(commits);
        } else {
          draft.treeCommits[path] = commits;
        }
        draft.loadingCommits = false;
      }),
    [String(routePathChange)]: clearState,
    [String(repoChange)]: clearState,
  },
  initialState
);
