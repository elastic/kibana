/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import produce from 'immer';
import { Action, handleActions } from 'redux-actions';

import {
  RepositoryUri,
  WorkerProgress,
  WorkerReservedProgress,
  IndexWorkerProgress,
  CloneWorkerProgress,
  RepoState,
} from '../../model';
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
  FetchRepoFileStatus,
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

const getIndexState = (indexStatus: IndexWorkerProgress) => {
  const progress = indexStatus.progress;
  if (
    progress === WorkerReservedProgress.ERROR ||
    progress === WorkerReservedProgress.TIMEOUT ||
    progress < WorkerReservedProgress.INIT
  ) {
    return RepoState.INDEX_ERROR;
  } else if (progress < WorkerReservedProgress.COMPLETED) {
    return RepoState.INDEXING;
  } else if (progress === WorkerReservedProgress.COMPLETED) {
    return RepoState.READY;
  }
  return RepoState.UNKNOWN;
};

const getGitState = (gitStatus: CloneWorkerProgress) => {
  const progress = gitStatus.progress;
  if (
    progress === WorkerReservedProgress.ERROR ||
    progress === WorkerReservedProgress.TIMEOUT ||
    progress < WorkerReservedProgress.INIT
  ) {
    return RepoState.CLONE_ERROR;
  } else if (progress < WorkerReservedProgress.COMPLETED) {
    if (gitStatus.cloneProgress && gitStatus.cloneProgress.isCloned) {
      return RepoState.UPDATING;
    }
    return RepoState.CLONING;
  } else if (progress === WorkerReservedProgress.COMPLETED) {
    return RepoState.READY;
  }
  return RepoState.UNKNOWN;
};

const getDeleteState = (deleteStatus: WorkerProgress) => {
  const progress = deleteStatus.progress;
  if (
    progress === WorkerReservedProgress.ERROR ||
    progress === WorkerReservedProgress.TIMEOUT ||
    progress < WorkerReservedProgress.INIT
  ) {
    return RepoState.DELETE_ERROR;
  } else if (progress < WorkerReservedProgress.COMPLETED) {
    return RepoState.DELETING;
  } else {
    return RepoState.UNKNOWN;
  }
};

export const status = handleActions<StatusState, StatusPayload>(
  {
    [String(loadStatus)]: state =>
      produce<StatusState>(state, draft => {
        draft.loading = true;
      }),
    [String(loadStatusSuccess)]: (state, action: Action<StatusSuccessPayload>) =>
      produce<StatusState>(state, draft => {
        draft.loading = false;
        Object.keys(action.payload!).forEach((repoUri: RepositoryUri) => {
          const statuses = action.payload![repoUri]!;
          if (statuses.deleteStatus) {
            // 1. Look into delete status first
            const deleteState = getDeleteState(statuses.deleteStatus);
            draft.status[repoUri] = {
              ...statuses.deleteStatus,
              state: deleteState,
            };
            return;
          } else {
            // 2. Then take the index state and git clone state into
            // account in the meantime.
            let indexState = RepoState.UNKNOWN;
            if (statuses.indexStatus) {
              indexState = getIndexState(statuses.indexStatus);
            }
            let gitState = RepoState.UNKNOWN;
            if (statuses.gitStatus) {
              gitState = getGitState(statuses.gitStatus);
            }

            if (statuses.gitStatus) {
              // Git state has higher priority over index state
              if (gitState === RepoState.CLONING || gitState === RepoState.CLONE_ERROR) {
                draft.status[repoUri] = {
                  ...statuses.gitStatus,
                  state: gitState,
                };
                return;
              } else if (gitState === RepoState.READY && !statuses.indexStatus) {
                // If git state is ready and index status is not there, then return
                // the git status
                draft.status[repoUri] = {
                  ...statuses.gitStatus,
                  state: gitState,
                };
                return;
              }
            }

            if (statuses.indexStatus) {
              draft.status[repoUri] = {
                ...statuses.indexStatus,
                state: indexState,
              };
              return;
            }

            // If non of delete/git/index status exists, then do nothing here.
          }
        });
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
    [String(FetchRepoFileStatus)]: (state: StatusState, action: Action<any>) =>
      produce<StatusState>(state, (draft: StatusState) => {
        draft.currentStatusPath = action.payload;
      }),
  },
  initialState
);
