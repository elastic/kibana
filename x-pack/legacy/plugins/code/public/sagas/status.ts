/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Action } from 'redux-actions';
import { call, put, select, takeEvery, takeLatest } from 'redux-saga/effects';
import { kfetch } from 'ui/kfetch';
import { isEqual } from 'lodash';

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
  FetchRepoFileStatus,
  FetchRepoFileStatusSuccess,
  FetchRepoFileStatusFailed,
  FetchFilePayload,
} from '../actions';
import * as ROUTES from '../components/routes';
import { RootState } from '../reducers';
import { mainRoutePattern } from './patterns';
import { StatusReport } from '../../common/repo_file_status';

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
  yield put(deleteRepoFinished(action.payload.uri));
}

export function* watchRepoDeleteFinished() {
  yield takeEvery(deleteCompletedPattern, handleRepoDeleteFinished);
}

function* handleMainRouteChange(action: Action<Match>) {
  // in source view page, we need repos as default repo scope options when no query input
  const { resource, org, repo, path, revision } = action.payload!.params;
  const uri = `${resource}/${org}/${repo}`;
  const newStatusPath: FetchFilePayload = { uri, revision, path };
  const currentStatusPath = yield select((state: RootState) => state.status.currentStatusPath);
  if (!isEqual(newStatusPath, currentStatusPath)) {
    yield call(fetchStatus, newStatusPath);
  }
}

function* fetchStatus(location: FetchFilePayload) {
  yield put(FetchRepoFileStatus(location));
  try {
    const newStatus = yield call(requestStatus, location);
    yield put(
      FetchRepoFileStatusSuccess({
        statusReport: newStatus as StatusReport,
        path: location,
      })
    );
  } catch (e) {
    yield put(FetchRepoFileStatusFailed(e));
  }
}

function requestStatus(location: FetchFilePayload) {
  const { uri, revision, path } = location;
  return kfetch({
    pathname: `/api/code/repo/${uri}/status/${revision}/${path}`,
    method: 'GET',
  });
}

export function* watchStatusChange() {
  yield takeLatest(mainRoutePattern, handleMainRouteChange);
}
