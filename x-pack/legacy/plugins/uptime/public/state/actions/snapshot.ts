/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Snapshot } from '../../../common/runtime_types';

export const FETCH_SNAPSHOT_COUNT = 'FETCH_SNAPSHOT_COUNT';
export const FETCH_SNAPSHOT_COUNT_FAIL = 'FETCH_SNAPSHOT_COUNT_FAIL';
export const FETCH_SNAPSHOT_COUNT_SUCCESS = 'FETCH_SNAPSHOT_COUNT_SUCCESS';

export interface GetSnapshotPayload {
  dateRangeStart: string;
  dateRangeEnd: string;
  filters?: string;
  statusFilter?: string;
}

interface GetSnapshotCountFetchAction {
  type: typeof FETCH_SNAPSHOT_COUNT;
  payload: GetSnapshotPayload;
}

interface GetSnapshotCountSuccessAction {
  type: typeof FETCH_SNAPSHOT_COUNT_SUCCESS;
  payload: Snapshot;
}

interface GetSnapshotCountFailAction {
  type: typeof FETCH_SNAPSHOT_COUNT_FAIL;
  payload: Error;
}

export type SnapshotActionTypes =
  | GetSnapshotCountFetchAction
  | GetSnapshotCountSuccessAction
  | GetSnapshotCountFailAction;

export const fetchSnapshotCount = (
  dateRangeStart: string,
  dateRangeEnd: string,
  filters?: string,
  statusFilter?: string
): GetSnapshotCountFetchAction => ({
  type: FETCH_SNAPSHOT_COUNT,
  payload: {
    dateRangeStart,
    dateRangeEnd,
    filters,
    statusFilter,
  },
});

export const fetchSnapshotCountFail = (error: Error): GetSnapshotCountFailAction => ({
  type: FETCH_SNAPSHOT_COUNT_FAIL,
  payload: error,
});

export const fetchSnapshotCountSuccess = (snapshot: Snapshot) => ({
  type: FETCH_SNAPSHOT_COUNT_SUCCESS,
  payload: snapshot,
});
