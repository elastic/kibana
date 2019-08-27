/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createAction } from 'redux-actions';
import { FileTree } from '../../model';
import { CommitInfo, ReferenceInfo } from '../../model/commit';

export interface FetchRepoPayload {
  uri: string;
}

export interface FetchRepoPayloadWithRevision extends FetchRepoPayload {
  revision: string;
}
export interface FetchFilePayload extends FetchRepoPayloadWithRevision {
  path: string;
}
export interface FetchRepoTreePayload extends FetchFilePayload {
  limit?: number;
  parents?: boolean;
  isDir: boolean;
}

export interface FetchFileResponse {
  payload: FetchFilePayload;
  isNotFound?: boolean;
  content?: string;
  lang?: string;
  isImage?: boolean;
  isUnsupported?: boolean;
  isOversize?: boolean;
  url?: string;
}

export interface RepoTreePayload {
  tree: FileTree;
  path: string;
  withParents: boolean | undefined;
  revision: string;
}

export interface TreeCommitPayload {
  path: string;
  commits: CommitInfo[];
  append?: boolean;
}

export const fetchRootRepoTree = createAction<FetchRepoPayloadWithRevision>('FETCH ROOT REPO TREE');
export const fetchRootRepoTreeSuccess = createAction<{ tree: FileTree; revision: string }>(
  'FETCH ROOT REPO TREE SUCCESS'
);
export const fetchRootRepoTreeFailed = createAction<Error>('FETCH ROOT REPO TREE FAILED');

export const fetchRepoTree = createAction<FetchRepoTreePayload>('FETCH REPO TREE');
export const fetchRepoTreeSuccess = createAction<RepoTreePayload>('FETCH REPO TREE SUCCESS');
export const fetchRepoTreeFailed = createAction<Error>('FETCH REPO TREE FAILED');

export const fetchRepoBranches = createAction<FetchRepoPayload>('FETCH REPO BRANCHES');
export const fetchRepoBranchesSuccess = createAction<ReferenceInfo[]>(
  'FETCH REPO BRANCHES SUCCESS'
);
export const fetchRepoBranchesFailed = createAction<Error>('FETCH REPO BRANCHES FAILED');
export const fetchRepoCommits = createAction<FetchRepoPayloadWithRevision>('FETCH REPO COMMITS');
export const fetchRepoCommitsSuccess = createAction<CommitInfo[]>('FETCH REPO COMMITS SUCCESS');
export const fetchRepoCommitsFailed = createAction<Error>('FETCH REPO COMMITS FAILED');

export const fetchFile = createAction<FetchFilePayload>('FETCH FILE');
export const fetchFileSuccess = createAction<FetchFileResponse>('FETCH FILE SUCCESS');
export const fetchFileFailed = createAction<Error>('FETCH FILE ERROR');

export const fetchDirectory = createAction<FetchRepoTreePayload>('FETCH REPO DIR');
export const fetchDirectorySuccess = createAction<FileTree>('FETCH REPO DIR SUCCESS');
export const fetchDirectoryFailed = createAction<Error>('FETCH REPO DIR FAILED');
export const setNotFound = createAction<boolean>('SET FILE NOT FOUND');
export const dirNotFound = createAction<string>('DIR NOT FOUND');

export const fetchTreeCommits = createAction<FetchFilePayload>('FETCH TREE COMMITS');
export const fetchTreeCommitsSuccess = createAction<TreeCommitPayload>(
  'FETCH TREE COMMITS SUCCESS'
);
export const fetchTreeCommitsFailed = createAction<Error>('FETCH TREE COMMITS FAILED');

export const fetchMoreCommits = createAction<string>('FETCH MORE COMMITS');
