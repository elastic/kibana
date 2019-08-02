/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { npStart } from 'ui/new_platform';

import { Action } from 'redux-actions';
import { call, put, takeEvery, takeLatest, take } from 'redux-saga/effects';
import {
  deleteRepo,
  deleteRepoFailed,
  deleteRepoSuccess,
  fetchRepoConfigFailed,
  fetchRepoConfigs,
  fetchRepoConfigSuccess,
  fetchRepos,
  fetchReposFailed,
  fetchReposSuccess,
  gotoRepo,
  importRepo,
  importRepoFailed,
  importRepoSuccess,
  indexRepo,
  indexRepoFailed,
  indexRepoSuccess,
  initRepoCommand,
  updateDeleteProgress,
  updateIndexProgress,
  gotoRepoFailed,
  loadRepo,
  loadRepoSuccess,
  loadRepoFailed,
} from '../actions';
import { loadLanguageServers } from '../actions/language_server';
import { history } from '../utils/url';
import { adminRoutePattern } from './patterns';

function requestRepos(): any {
  return npStart.core.http.get('/api/code/repos');
}

function* handleFetchRepos() {
  try {
    const repos = yield call(requestRepos);
    yield put(fetchReposSuccess(repos));
  } catch (err) {
    yield put(fetchReposFailed(err));
  }
}

function requestDeleteRepo(uri: string) {
  return npStart.core.http.delete(`/api/code/repo/${uri}`);
}

function requestIndexRepo(uri: string) {
  return npStart.core.http.post(`/api/code/repo/index/${uri}`, {
    body: JSON.stringify({ reindex: true }),
  });
}

function* handleDeleteRepo(action: Action<string>) {
  try {
    yield call(requestDeleteRepo, action.payload || '');
    yield put(deleteRepoSuccess(action.payload || ''));
    yield put(
      updateDeleteProgress({
        uri: action.payload!,
        progress: 0,
      })
    );
  } catch (err) {
    yield put(deleteRepoFailed(err));
  }
}

function* handleIndexRepo(action: Action<string>) {
  try {
    yield call(requestIndexRepo, action.payload || '');
    yield put(indexRepoSuccess(action.payload || ''));
    yield put(
      updateIndexProgress({
        uri: action.payload!,
        progress: 0,
      })
    );
  } catch (err) {
    yield put(indexRepoFailed(err));
  }
}

function requestImportRepo(uri: string) {
  return npStart.core.http.post('/api/code/repo', {
    body: JSON.stringify({ url: uri }),
  });
}

function* handleImportRepo(action: Action<string>) {
  try {
    const data = yield call(requestImportRepo, action.payload || '');
    yield put(importRepoSuccess(data));
  } catch (err) {
    yield put(importRepoFailed(err));
  }
}
function* handleFetchRepoConfigs() {
  try {
    const configs = yield call(requestRepoConfigs);
    yield put(fetchRepoConfigSuccess(configs));
  } catch (e) {
    yield put(fetchRepoConfigFailed(e));
  }
}

function requestRepoConfigs() {
  return npStart.core.http.get('/api/code/workspace');
}

function* handleInitCmd(action: Action<string>) {
  const repoUri = action.payload as string;
  yield call(requestRepoInitCmd, repoUri);
}

function requestRepoInitCmd(repoUri: string) {
  return npStart.core.http.post(`/api/code/workspace/${repoUri}/master`, {
    query: { force: true },
  });
}
function* handleGotoRepo(action: Action<string>) {
  try {
    const repoUri = action.payload as string;
    yield put(loadRepo(repoUri));
    const loadRepoDoneAction = yield take([String(loadRepoSuccess), String(loadRepoFailed)]);
    if (loadRepoDoneAction.type === String(loadRepoSuccess)) {
      history.replace(`/${repoUri}/tree/${loadRepoDoneAction.payload.defaultBranch || 'master'}`);
    } else {
      // redirect to root project path if repo not found to show 404 page
      history.replace(`/${action.payload}/tree/master`);
    }
  } catch (e) {
    history.replace(`/${action.payload}/tree/master`);
    yield put(gotoRepoFailed(e));
  }
}

export function* watchImportRepo() {
  yield takeEvery(String(importRepo), handleImportRepo);
}

export function* watchDeleteRepo() {
  yield takeEvery(String(deleteRepo), handleDeleteRepo);
}

export function* watchIndexRepo() {
  yield takeEvery(String(indexRepo), handleIndexRepo);
}

export function* watchFetchRepos() {
  yield takeEvery(String(fetchRepos), handleFetchRepos);
}

export function* watchFetchRepoConfigs() {
  yield takeEvery(String(fetchRepoConfigs), handleFetchRepoConfigs);
}

export function* watchInitRepoCmd() {
  yield takeEvery(String(initRepoCommand), handleInitCmd);
}

export function* watchGotoRepo() {
  yield takeLatest(String(gotoRepo), handleGotoRepo);
}

function* handleAdminRouteChange() {
  yield put(fetchRepos());
  yield put(fetchRepoConfigs());
  yield put(loadLanguageServers());
}

export function* watchAdminRouteChange() {
  yield takeLatest(adminRoutePattern, handleAdminRouteChange);
}
