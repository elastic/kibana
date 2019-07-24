/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Action } from 'redux-actions';
import { kfetch } from 'ui/kfetch';
import { all, call, put, takeEvery } from 'redux-saga/effects';
import { Repository, RepositoryConfig } from '../../model';
import {
  fetchReposSuccess,
  RepoConfigPayload,
  switchLanguageServer,
  switchLanguageServerFailed,
  switchLanguageServerSuccess,
} from '../actions';
import { loadConfigsFailed, loadConfigsSuccess } from '../actions/project_config';

function putProjectConfig(repoUri: string, config: RepositoryConfig) {
  return kfetch({
    pathname: `/api/code/repo/config/${repoUri}`,
    method: 'PUT',
    body: JSON.stringify(config),
  });
}

function* switchProjectLanguageServer(action: Action<RepoConfigPayload>) {
  try {
    const { repoUri, config } = action.payload!;
    yield call(putProjectConfig, repoUri, config);
    yield put(switchLanguageServerSuccess());
  } catch (err) {
    yield put(switchLanguageServerFailed(err));
  }
}

export function* watchSwitchProjectLanguageServer() {
  yield takeEvery(String(switchLanguageServer), switchProjectLanguageServer);
}

function fetchConfigs(repoUri: string) {
  return kfetch({
    pathname: `/api/code/repo/config/${repoUri}`,
  });
}

function* loadConfigs(action: Action<Repository[]>) {
  try {
    const repositories = action.payload!;
    const promises = repositories.map(repo => call(fetchConfigs, repo.uri));
    const configs = yield all(promises);
    yield put(
      loadConfigsSuccess(
        configs.reduce((acc: { [k: string]: RepositoryConfig }, config: RepositoryConfig) => {
          acc[config.uri] = config;
          return acc;
        }, {})
      )
    );
  } catch (err) {
    yield put(loadConfigsFailed(err));
  }
}

export function* watchLoadConfigs() {
  yield takeEvery(String(fetchReposSuccess), loadConfigs);
}
