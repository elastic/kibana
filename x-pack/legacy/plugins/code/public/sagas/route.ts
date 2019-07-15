/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { put, takeEvery, select } from 'redux-saga/effects';
import { Action } from 'redux-actions';
import { routeChange, Match } from '../actions';
import { previousMatchSelector } from '../selectors';
import { routePathChange, repoChange, revisionChange, filePathChange } from '../actions/route';
import * as ROUTES from '../components/routes';

const getRepoFromMatch = (match: Match) =>
  `${match.params.resources}/${match.params.org}/${match.params.repo}`;

function* handleRoute(action: Action<any>) {
  const currentMatch = action.payload;
  const previousMatch = yield select(previousMatchSelector);
  if (currentMatch.path !== previousMatch.path) {
    yield put(routePathChange());
  } else if (currentMatch.path === ROUTES.MAIN) {
    const currentRepo = getRepoFromMatch(currentMatch);
    const previousRepo = getRepoFromMatch(previousMatch);
    const currentRevision = currentMatch.params.revision;
    const previousRevision = previousMatch.params.revision;
    const currentFilePath = currentMatch.params.path;
    const previousFilePath = previousMatch.params.path;
    if (currentRepo !== previousRepo) {
      yield put(repoChange());
    }
    if (currentRevision !== previousRevision) {
      yield put(revisionChange());
    }
    if (currentFilePath !== previousFilePath) {
      yield put(filePathChange());
    }
  }
}

export function* watchRoute() {
  yield takeEvery(String(routeChange), handleRoute);
}
