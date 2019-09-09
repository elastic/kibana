/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createAction } from 'redux-actions';

import {
  CloneProgress,
  CloneWorkerProgress,
  Repository,
  RepositoryUri,
  RepoState,
  WorkerProgress,
} from '../../model';
import { FetchFilePayload } from './file';
import { StatusReport } from '../../common/repo_file_status';

export interface RepoStatus {
  uri: string;
  progress: number;
  cloneProgress?: CloneProgress;
  timestamp?: Date;
  state?: RepoState;
  errorMessage?: string;
}

export interface StatusSuccessPayload {
  [key: string]: {
    gitStatus: CloneWorkerProgress | null;
    indexStatus: WorkerProgress | null;
    deleteStatus: WorkerProgress | null;
  };
}

export const loadStatus = createAction<string>('LOAD STATUS');
export const loadStatusSuccess = createAction<StatusSuccessPayload>('LOAD STATUS SUCCESS');
export const loadStatusFailed = createAction<Error>('LOAD STATUS FAILED');

export const loadRepo = createAction<string>('LOAD REPO');
export const loadRepoSuccess = createAction<Repository[]>('LOAD REPO SUCCESS');
export const loadRepoFailed = createAction<Error>('LOAD REPO FAILED');

export const updateCloneProgress = createAction<RepoStatus>('UPDATE CLONE PROGRESS');
export const updateIndexProgress = createAction<RepoStatus>('UPDATE INDEX PROGRESS');
export const updateDeleteProgress = createAction<RepoStatus>('UPDATE DELETE PROGRESS');

export const pollRepoCloneStatusStart = createAction<string>('POLL CLONE STATUS START');
export const pollRepoIndexStatusStart = createAction<string>('POLL INDEX STATUS START');
export const pollRepoDeleteStatusStart = createAction<string>('POLL DELETE STATUS START');

export const pollRepoCloneStatusStop = createAction<RepositoryUri>('POLL CLONE STATUS STOP');
export const pollRepoIndexStatusStop = createAction<RepositoryUri>('POLL INDEX STATUS STOP');
export const pollRepoDeleteStatusStop = createAction<RepositoryUri>('POLL DELETE STATUS STOP');

export const FetchRepoFileStatus = createAction<FetchFilePayload>('FETCH REPO FILE STATUS');
export const FetchRepoFileStatusSuccess = createAction<{
  path: FetchFilePayload;
  statusReport: StatusReport;
}>('FETCH REPO FILE STATUS SUCCESS');
export const FetchRepoFileStatusFailed = createAction<any>('FETCH REPO FILE STATUS FAILED');

export const StatusChanged = createAction<{
  prevStatus: StatusReport;
  currentStatus: StatusReport;
}>('STATUS CHANGED');
