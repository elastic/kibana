/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Action } from 'redux-actions';
import { put, select, takeEvery } from 'redux-saga/effects';
import { RepositoryUri, WorkerReservedProgress } from '../../model';
import {
  deleteRepoFinished,
  Match,
  routeChange,
  updateCloneProgress,
  updateDeleteProgress,
  pollRepoCloneStatusStop,
  pollRepoDeleteStatusStop,
  pollRepoIndexStatusStop,
} from '../actions';
import * as ROUTES from '../components/routes';
import { RootState } from '../reducers';

const matchSelector = (state: RootState) => state.route.match;

export const cloneCompletedPattern = (action: Action<any>) =>
  action.type === String(updateCloneProgress) &&
  action.payload.progress === WorkerReservedProgress.COMPLETED;

const deleteCompletedPattern = (action: Action<any>) =>
  action.type === String(updateDeleteProgress) &&
  action.payload.progress === WorkerReservedProgress.COMPLETED;

export const cloneRepoStatusPollingStopPattern = (repoUri: RepositoryUri) => {
  return (action: Action<any>) => {
    return action.type === String(pollRepoCloneStatusStop) && action.payload === repoUri;
  };
};

export const indexRepoStatusPollingStopPattern = (repoUri: RepositoryUri) => {
  return (action: Action<any>) => {
    return action.type === String(pollRepoIndexStatusStop) && action.payload === repoUri;
  };
};

export const deleteRepoStatusPollingStopPattern = (repoUri: RepositoryUri) => {
  return (action: Action<any>) => {
    return action.type === String(pollRepoDeleteStatusStop) && action.payload === repoUri;
  };
};

function* handleRepoCloneSuccess() {
  const match: Match = yield select(matchSelector);
  if (match.path === ROUTES.MAIN || match.path === ROUTES.MAIN_ROOT) {
    yield put(routeChange(match));
  }
}

export function* watchRepoCloneSuccess() {
  yield takeEvery(cloneCompletedPattern, handleRepoCloneSuccess);
}

function* handleRepoDeleteFinished(action: any) {
  yield put(deleteRepoFinished(action.payload.repoUri));
}

export function* watchRepoDeleteFinished() {
  yield takeEvery(deleteCompletedPattern, handleRepoDeleteFinished);
}
