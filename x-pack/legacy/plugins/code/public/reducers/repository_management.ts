/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import produce from 'immer';
import { Action, handleActions } from 'redux-actions';

import { Repository, RepoConfigs, RepositoryConfig } from '../../model';

import {
  closeToast,
  deleteRepoFinished,
  fetchRepos,
  fetchReposFailed,
  fetchReposSuccess,
  importRepo,
  importRepoFailed,
  importRepoSuccess,
  fetchRepoConfigSuccess,
  loadConfigsSuccess,
} from '../actions';

export enum ToastType {
  danger = 'danger',
  success = 'success',
  warning = 'warning',
}

export interface RepositoryManagementState {
  repoConfigs?: RepoConfigs;
  repoLangseverConfigs: { [key: string]: RepositoryConfig };
  repositories: Repository[];
  error?: Error;
  loading: boolean;
  importLoading: boolean;
  showToast: boolean;
  toastMessage?: string;
  toastType?: ToastType;
}

const initialState: RepositoryManagementState = {
  repositories: [],
  repoLangseverConfigs: {},
  loading: false,
  importLoading: false,
  showToast: false,
};

export const repositoryManagement = handleActions(
  {
    [String(fetchRepos)]: (state: RepositoryManagementState) =>
      produce<RepositoryManagementState>(state, draft => {
        draft.loading = true;
      }),
    [String(fetchReposSuccess)]: (state: RepositoryManagementState, action: Action<any>) =>
      produce<RepositoryManagementState>(state, draft => {
        draft.loading = false;
        draft.repositories = action.payload || [];
      }),
    [String(fetchReposFailed)]: (state: RepositoryManagementState, action: Action<any>) => {
      if (action.payload) {
        return produce<RepositoryManagementState>(state, draft => {
          draft.error = action.payload;
          draft.loading = false;
        });
      } else {
        return state;
      }
    },
    [String(deleteRepoFinished)]: (state: RepositoryManagementState, action: Action<any>) =>
      produce<RepositoryManagementState>(state, (draft: RepositoryManagementState) => {
        draft.repositories = state.repositories.filter(repo => repo.uri !== action.payload);
      }),
    [String(importRepo)]: (state: RepositoryManagementState) =>
      produce<RepositoryManagementState>(state, draft => {
        draft.importLoading = true;
      }),
    [String(importRepoSuccess)]: (state: RepositoryManagementState, action: Action<any>) =>
      produce<RepositoryManagementState>(state, (draft: RepositoryManagementState) => {
        draft.importLoading = false;
        draft.showToast = true;
        draft.toastType = ToastType.success;
        draft.toastMessage = `${action.payload.name} has been successfully submitted!`;
        draft.repositories = [...state.repositories, action.payload];
      }),
    [String(importRepoFailed)]: (state: RepositoryManagementState, action: Action<any>) =>
      produce<RepositoryManagementState>(state, draft => {
        if (action.payload) {
          if (action.payload.res.status === 304) {
            draft.toastMessage = 'This Repository has already been imported!';
            draft.showToast = true;
            draft.toastType = ToastType.warning;
            draft.importLoading = false;
          } else {
            draft.toastMessage = action.payload.body.message;
            draft.showToast = true;
            draft.toastType = ToastType.danger;
            draft.importLoading = false;
          }
        }
      }),
    [String(closeToast)]: (state: RepositoryManagementState, action: Action<any>) =>
      produce<RepositoryManagementState>(state, draft => {
        draft.showToast = false;
      }),
    [String(fetchRepoConfigSuccess)]: (state: RepositoryManagementState, action: Action<any>) =>
      produce<RepositoryManagementState>(state, draft => {
        draft.repoConfigs = action.payload;
      }),
    [String(loadConfigsSuccess)]: (state: RepositoryManagementState, action: Action<any>) =>
      produce<RepositoryManagementState>(state, draft => {
        draft.repoLangseverConfigs = action.payload;
      }),
  },
  initialState
);
