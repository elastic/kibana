/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createAction } from 'redux-actions';

import { Repository, RepositoryConfig } from '../../model';
import { RepoConfigs } from '../../model/workspace';

export interface RepoConfigPayload {
  repoUri: string;
  config: RepositoryConfig;
}

export const fetchRepos = createAction('FETCH REPOS');
export const fetchReposSuccess = createAction<Repository[]>('FETCH REPOS SUCCESS');
export const fetchReposFailed = createAction<Error>('FETCH REPOS FAILED');

export const deleteRepo = createAction<string>('DELETE REPOS');
export const deleteRepoSuccess = createAction<string>('DELETE REPOS SUCCESS');
export const deleteRepoFinished = createAction<string>('DELETE REPOS FINISHED');
export const deleteRepoFailed = createAction<Error>('DELETE REPOS FAILED');

export const indexRepo = createAction<string>('INDEX REPOS');
export const indexRepoSuccess = createAction<string>('INDEX REPOS SUCCESS');
export const indexRepoFailed = createAction<Error>('INDEX REPOS FAILED');

export const importRepo = createAction<string>('IMPORT REPO');
export const importRepoSuccess = createAction<Repository>('IMPORT REPO SUCCESS');
export const importRepoFailed = createAction<Error>('IMPORT REPO FAILED');

export const closeToast = createAction('CLOSE TOAST');

export const fetchRepoConfigs = createAction('FETCH REPO CONFIGS');
export const fetchRepoConfigSuccess = createAction<RepoConfigs>('FETCH REPO CONFIGS SUCCESS');
export const fetchRepoConfigFailed = createAction<Error>('FETCH REPO CONFIGS FAILED');

export const initRepoCommand = createAction<string>('INIT REPO CMD');

export const gotoRepo = createAction<string>('GOTO REPO');
export const gotoRepoFailed = createAction('GOTO REPO FAILED');

export const switchLanguageServer = createAction<RepoConfigPayload>('SWITCH LANGUAGE SERVER');
export const switchLanguageServerSuccess = createAction('SWITCH LANGUAGE SERVER SUCCESS');
export const switchLanguageServerFailed = createAction<Error>('SWITCH LANGUAGE SERVER FAILED');
