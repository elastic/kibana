/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import produce from 'immer';
import { handleActions } from 'redux-actions';
import { CommitInfo, ReferenceInfo, ReferenceType } from '../../model/commit';
import {
  fetchMoreCommits,
  fetchRepoBranchesSuccess,
  fetchRepoCommitsSuccess,
  fetchTreeCommits,
  fetchTreeCommitsFailed,
  fetchTreeCommitsSuccess,
} from '../actions';

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

export const revision = handleActions(
  {
    [String(fetchRepoCommitsSuccess)]: (state: RevisionState, action: any) =>
      produce<RevisionState>(state, draft => {
        draft.treeCommits[''] = action.payload;
        draft.loadingCommits = false;
      }),
    [String(fetchMoreCommits)]: (state: RevisionState, action: any) =>
      produce<RevisionState>(state, draft => {
        draft.loadingCommits = true;
      }),
    [String(fetchRepoBranchesSuccess)]: (state: RevisionState, action: any) =>
      produce<RevisionState>(state, (draft: RevisionState) => {
        const references = action.payload as ReferenceInfo[];
        draft.tags = references.filter(r => r.type === ReferenceType.TAG);
        draft.branches = references.filter(r => r.type !== ReferenceType.TAG);
      }),
    [String(fetchTreeCommits)]: (state: RevisionState) =>
      produce<RevisionState>(state, draft => {
        draft.loadingCommits = true;
      }),
    [String(fetchTreeCommitsFailed)]: (state: RevisionState) =>
      produce<RevisionState>(state, draft => {
        draft.loadingCommits = false;
      }),
    [String(fetchTreeCommitsSuccess)]: (state: RevisionState, action: any) =>
      produce<RevisionState>(state, draft => {
        const { path, commits, append } = action.payload;
        if (commits.length === 0) {
          draft.commitsFullyLoaded[path] = true;
        } else if (append) {
          draft.treeCommits[path] = draft.treeCommits[path].concat(commits);
        } else {
          draft.treeCommits[path] = commits;
        }
        draft.loadingCommits = false;
      }),
  },
  initialState
);
