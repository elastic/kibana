/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const FETCH_SNAPSHOT_COUNT = 'FETCH_SNAPSHOT_COUNT';

interface GetSnapshotPayload {
  dateRangeStart: string;
  dateRangeEnd: string;
  filters?: string;
  statusFilter?: string;
}

interface GetSnapshotCountAction {
  type: typeof FETCH_SNAPSHOT_COUNT;
  payload: GetSnapshotPayload;
}

export const fetchSnapshotCount = (
  dateRangeStart: string,
  dateRangeEnd: string,
  filters?: string,
  statusFilter?: string
): GetSnapshotCountAction => ({
  type: FETCH_SNAPSHOT_COUNT,
  payload: {
    dateRangeStart,
    dateRangeEnd,
    filters,
    statusFilter,
  },
});
