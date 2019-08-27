/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import produce from 'immer';
import { Action, handleActions } from 'redux-actions';

import { i18n } from '@kbn/i18n';
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
  RepoLangserverConfigs,
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

type RepositoryManagementStatePayload = RepoConfigs &
  RepoLangserverConfigs &
  Repository &
  RepositoryConfig &
  Repository[] &
  Error &
  string;

export const repositoryManagement = handleActions<
  RepositoryManagementState,
  RepositoryManagementStatePayload
>(
  {
    [String(fetchRepos)]: state =>
      produce<RepositoryManagementState>(state, draft => {
        draft.loading = true;
      }),
    [String(fetchReposSuccess)]: (state, action: Action<Repository[]>) =>
      produce<RepositoryManagementState>(state, draft => {
        draft.loading = false;
        draft.repositories = action.payload || [];
      }),
    [String(fetchReposFailed)]: (state, action: Action<Error>) => {
      if (action.payload) {
        return produce<RepositoryManagementState>(state, draft => {
          draft.error = action.payload;
          draft.loading = false;
        });
      } else {
        return state;
      }
    },
    [String(deleteRepoFinished)]: (state, action: Action<string>) =>
      produce<RepositoryManagementState>(state, draft => {
        draft.repositories = state.repositories.filter(repo => repo.uri !== action.payload);
      }),
    [String(importRepo)]: state =>
      produce<RepositoryManagementState>(state, draft => {
        draft.importLoading = true;
      }),
    [String(importRepoSuccess)]: (state, action: Action<Repository>) =>
      // TODO is it possible and how to deal with action.payload === undefined?
      produce<RepositoryManagementState>(state, draft => {
        draft.importLoading = false;
        draft.showToast = true;
        draft.toastType = ToastType.success;
        draft.toastMessage = i18n.translate(
          'xpack.code.repositoryManagement.repoSubmittedMessage',
          {
            defaultMessage: '{name} has been successfully submitted!',
            values: { name: action.payload!.name },
          }
        );
        draft.repositories = [...state.repositories, action.payload!];
      }),
    [String(importRepoFailed)]: (state, action: Action<any>) =>
      produce<RepositoryManagementState>(state, draft => {
        if (action.payload) {
          if (action.payload.response && action.payload.response.status === 304) {
            draft.toastMessage = i18n.translate(
              'xpack.code.repositoryManagement.repoImportedMessage',
              {
                defaultMessage: 'This Repository has already been imported!',
              }
            );
            draft.showToast = true;
            draft.toastType = ToastType.warning;
            draft.importLoading = false;
          } else {
            // TODO add localication for those messages
            draft.toastMessage = action.payload.body.message;
            draft.showToast = true;
            draft.toastType = ToastType.danger;
            draft.importLoading = false;
          }
        }
      }),
    [String(closeToast)]: state =>
      produce<RepositoryManagementState>(state, draft => {
        draft.showToast = false;
      }),
    [String(fetchRepoConfigSuccess)]: (state, action: Action<RepoConfigs>) =>
      produce<RepositoryManagementState>(state, draft => {
        draft.repoConfigs = action.payload;
      }),
    [String(loadConfigsSuccess)]: (state, action: Action<RepoLangserverConfigs>) =>
      produce<RepositoryManagementState>(state, draft => {
        draft.repoLangseverConfigs = action.payload!;
      }),
  },
  initialState
);
