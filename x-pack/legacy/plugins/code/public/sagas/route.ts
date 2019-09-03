/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { put, takeEvery, select, takeLatest } from 'redux-saga/effects';
import { Action } from 'redux-actions';
import {
  routeChange,
  Match,
  loadRepo,
  fetchRepoBranches,
  fetchRepoCommits,
  fetchRootRepoTree,
} from '../actions';
import { previousMatchSelector, repoUriSelector, revisionSelector } from '../selectors';
import { routePathChange, repoChange, revisionChange, filePathChange } from '../actions/route';
import * as ROUTES from '../components/routes';

const MAIN_ROUTES = [ROUTES.MAIN, ROUTES.MAIN_ROOT];

function* handleRepoOrRevisionChange() {
  const repoUri = yield select(repoUriSelector);
  const revision = yield select(revisionSelector);
  yield put(fetchRepoCommits({ uri: repoUri, revision }));
  yield put(fetchRootRepoTree({ uri: repoUri, revision }));
}

export function* watchRepoOrRevisionChange() {
  yield takeLatest([String(repoChange), String(revisionChange)], handleRepoOrRevisionChange);
}

const getRepoFromMatch = (match: Match) =>
  `${match.params.resource}/${match.params.org}/${match.params.repo}`;

function* handleRoute(action: Action<any>) {
  const currentMatch = action.payload;
  const previousMatch = yield select(previousMatchSelector);
  if (MAIN_ROUTES.includes(currentMatch.path)) {
    if (MAIN_ROUTES.includes(previousMatch.path)) {
      const currentRepo = getRepoFromMatch(currentMatch);
      const previousRepo = getRepoFromMatch(previousMatch);
      const currentRevision = currentMatch.params.revision;
      const previousRevision = previousMatch.params.revision;
      const currentFilePath = currentMatch.params.path;
      const previousFilePath = previousMatch.params.path;
      if (currentRepo !== previousRepo) {
        yield put(repoChange(currentRepo));
      }
      if (currentRevision !== previousRevision) {
        yield put(revisionChange());
      }
      if (currentFilePath !== previousFilePath) {
        yield put(filePathChange());
      }
    } else {
      yield put(routePathChange());
      const currentRepo = getRepoFromMatch(currentMatch);
      yield put(repoChange(currentRepo));
      yield put(revisionChange());
      yield put(filePathChange());
    }
  } else if (currentMatch.path !== previousMatch.path) {
    yield put(routePathChange());
  }
}

export function* watchRoute() {
  yield takeEvery(String(routeChange), handleRoute);
}

export function* handleRepoChange(action: Action<string>) {
  yield put(loadRepo(action.payload!));
  yield put(fetchRepoBranches({ uri: action.payload! }));
}

export function* watchRepoChange() {
  yield takeEvery(String(repoChange), handleRepoChange);
}
