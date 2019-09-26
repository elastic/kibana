/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Action } from 'redux-actions';
import { call, put, select, takeEvery, takeLatest } from 'redux-saga/effects';
import { npStart } from 'ui/new_platform';
import { isEqual } from 'lodash';
import { delay } from 'redux-saga';

import { RepositoryUri, WorkerReservedProgress } from '../../model';
import {
  deleteRepoFinished,
  FetchFilePayload,
  FetchRepoFileStatus,
  FetchRepoFileStatusFailed,
  FetchRepoFileStatusSuccess,
  Match,
  pollRepoCloneStatusStop,
  pollRepoDeleteStatusStop,
  pollRepoIndexStatusStop,
  routeChange,
  StatusChanged,
  updateCloneProgress,
  updateDeleteProgress,
} from '../actions';
import * as ROUTES from '../components/routes';
import { RootState } from '../reducers';
import { adminRoutePattern, mainRoutePattern } from './patterns';
import { RepoFileStatus, StatusReport } from '../../common/repo_file_status';
import { statusSelector } from '../selectors';

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
    yield call(startPollingStatus, newStatusPath);
  }
}
const STATUS_POLLING_FREQ_HIGH_MS = 3000;
const STATUS_POLLING_FREQ_LOW_MS = 10000;

let polling: boolean = false;

function stopPollingStatus() {
  polling = false;
}
function* startPollingStatus(location: FetchFilePayload) {
  yield put(FetchRepoFileStatus(location));
  polling = true;
  let currentStatusPath = yield select((state: RootState) => state.status.currentStatusPath);
  while (polling && isEqual(location, currentStatusPath)) {
    const previousStatus: StatusReport = yield select(statusSelector);
    const newStatus: StatusReport = yield call(fetchStatus, location);
    let delayMs = STATUS_POLLING_FREQ_LOW_MS;
    if (newStatus) {
      yield call(compareStatus, previousStatus, newStatus);
      if (newStatus.langServerStatus === RepoFileStatus.LANG_SERVER_IS_INITIALIZING) {
        delayMs = STATUS_POLLING_FREQ_HIGH_MS;
      }
      currentStatusPath = yield select((state: RootState) => state.status.currentStatusPath);
    }
    yield call(delay, delayMs);
  }
}

function* compareStatus(prevStatus: StatusReport, currentStatus: StatusReport) {
  if (!isEqual(prevStatus, currentStatus)) {
    yield put(StatusChanged({ prevStatus, currentStatus }));
  }
}

function* fetchStatus(location: FetchFilePayload) {
  yield put(FetchRepoFileStatus(location));
  try {
    const newStatus: StatusReport = yield call(requestStatus, location);
    yield put(
      FetchRepoFileStatusSuccess({
        statusReport: newStatus,
        path: location,
      })
    );
    return newStatus;
  } catch (e) {
    yield put(FetchRepoFileStatusFailed(e));
  }
}

function requestStatus(location: FetchFilePayload) {
  const { uri, revision, path } = location;
  const pathname = path
    ? `/api/code/repo/${uri}/status/${revision}/${path}`
    : `/api/code/repo/${uri}/status/${revision}`;

  return npStart.core.http.get(pathname);
}

export function* watchStatusChange() {
  yield takeLatest(mainRoutePattern, handleMainRouteChange);
  yield takeLatest(adminRoutePattern, stopPollingStatus);
}
