/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import produce from 'immer';
import { Action, handleActions } from 'redux-actions';

import { RepositoryUri, WorkerReservedProgress } from '../../model';
import {
  deleteRepoFinished,
  FetchFilePayload,
  FetchRepoFileStatusSuccess,
  loadStatus,
  loadStatusFailed,
  loadStatusSuccess,
  updateCloneProgress,
  updateDeleteProgress,
  updateIndexProgress,
  StatusSuccessPayload,
  RepoStatus,
  RepoState,
} from '../actions';
import { StatusReport } from '../../common/repo_file_status';

export interface StatusState {
  status: { [key: string]: RepoStatus };
  loading: boolean;
  error?: Error;
  currentStatusPath?: FetchFilePayload;
  repoFileStatus?: StatusReport;
}

const initialState: StatusState = {
  status: {},
  loading: false,
};

type StatusPayload = RepoStatus & Error & StatusSuccessPayload & string;

export const status = handleActions<StatusState, StatusPayload>(
  {
    [String(loadStatus)]: state =>
      produce<StatusState>(state, draft => {
        draft.loading = true;
      }),
    [String(loadStatusSuccess)]: (state, action: Action<StatusSuccessPayload>) =>
      produce<StatusState>(state, draft => {
        Object.keys(action.payload!).forEach((repoUri: RepositoryUri) => {
          const statuses = action.payload![repoUri]!;
          if (statuses.deleteStatus) {
            // 1. Look into delete status first
            const progress = statuses.deleteStatus.progress;
            if (
              progress === WorkerReservedProgress.ERROR ||
              progress === WorkerReservedProgress.TIMEOUT
            ) {
              draft.status[repoUri] = {
                ...statuses.deleteStatus,
                state: RepoState.DELETE_ERROR,
              };
            } else if (progress < WorkerReservedProgress.COMPLETED) {
              draft.status[repoUri] = {
                ...statuses.deleteStatus,
                state: RepoState.DELETING,
              };
            }
          } else if (statuses.indexStatus) {
            const progress = statuses.indexStatus.progress;
            if (
              progress === WorkerReservedProgress.ERROR ||
              progress === WorkerReservedProgress.TIMEOUT
            ) {
              draft.status[repoUri] = {
                ...statuses.indexStatus,
                state: RepoState.INDEX_ERROR,
              };
            } else if (progress < WorkerReservedProgress.COMPLETED) {
              draft.status[repoUri] = {
                ...statuses.indexStatus,
                state: RepoState.INDEXING,
              };
            } else if (progress === WorkerReservedProgress.COMPLETED) {
              draft.status[repoUri] = {
                ...statuses.indexStatus,
                state: RepoState.READY,
              };
            }
          } else if (statuses.gitStatus) {
            const progress = statuses.gitStatus.progress;
            if (
              progress === WorkerReservedProgress.ERROR ||
              progress === WorkerReservedProgress.TIMEOUT
            ) {
              draft.status[repoUri] = {
                ...statuses.gitStatus,
                state: RepoState.CLONE_ERROR,
              };
            } else if (progress < WorkerReservedProgress.COMPLETED) {
              draft.status[repoUri] = {
                ...statuses.gitStatus,
                state: RepoState.CLONING,
              };
            } else if (progress === WorkerReservedProgress.COMPLETED) {
              draft.status[repoUri] = {
                ...statuses.gitStatus,
                state: RepoState.READY,
              };
            }
          }
        });
        draft.loading = false;
      }),
    [String(loadStatusFailed)]: (state, action: Action<Error>) =>
      produce<StatusState>(state, draft => {
        draft.loading = false;
        draft.error = action.payload;
      }),
    [String(updateCloneProgress)]: (state, action: Action<RepoStatus>) =>
      produce<StatusState>(state, draft => {
        const progress = action.payload!.progress;
        let s = RepoState.CLONING;
        if (
          progress === WorkerReservedProgress.ERROR ||
          progress === WorkerReservedProgress.TIMEOUT
        ) {
          s = RepoState.CLONE_ERROR;
        } else if (progress === WorkerReservedProgress.COMPLETED) {
          s = RepoState.READY;
        }
        draft.status[action.payload!.uri] = {
          ...action.payload!,
          state: s,
        };
      }),
    [String(updateIndexProgress)]: (state, action: Action<RepoStatus>) =>
      produce<StatusState>(state, draft => {
        const progress = action.payload!.progress;
        let s = RepoState.INDEXING;
        if (
          progress === WorkerReservedProgress.ERROR ||
          progress === WorkerReservedProgress.TIMEOUT
        ) {
          s = RepoState.INDEX_ERROR;
        } else if (progress === WorkerReservedProgress.COMPLETED) {
          s = RepoState.READY;
        }
        draft.status[action.payload!.uri] = {
          ...action.payload!,
          state: s,
        };
      }),
    [String(updateDeleteProgress)]: (state, action: Action<RepoStatus>) =>
      produce<StatusState>(state, draft => {
        const progress = action.payload!.progress;
        if (progress === WorkerReservedProgress.COMPLETED) {
          delete draft.status[action.payload!.uri];
        } else {
          let s = RepoState.DELETING;
          if (
            progress === WorkerReservedProgress.ERROR ||
            progress === WorkerReservedProgress.TIMEOUT
          ) {
            s = RepoState.DELETE_ERROR;
          }

          draft.status[action.payload!.uri] = {
            ...action.payload!,
            state: s,
          };
        }
      }),
    [String(deleteRepoFinished)]: (state, action: Action<string>) =>
      produce<StatusState>(state, draft => {
        delete draft.status[action.payload!];
      }),
    [String(FetchRepoFileStatusSuccess)]: (state: StatusState, action: Action<any>) =>
      produce<StatusState>(state, (draft: StatusState) => {
        const { path, statusReport } = action.payload;
        draft.repoFileStatus = statusReport;
        draft.currentStatusPath = path;
      }),
  },
  initialState
);
