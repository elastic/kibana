/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SnapshotCount } from '../../../common/graphql/types';
import { SnapshotActionTypes } from '../actions/snapshot';

export interface SnapshotState {
  count: SnapshotCount;
}

const initialState: SnapshotState = {
  count: {
    down: 0,
    mixed: 0,
    total: 0,
    up: 0,
  },
};

export function snapshotReducer(state = initialState, action: SnapshotActionTypes): SnapshotState {
  switch (action.type) {
    case FETCH_SNAPSHOT_COUNT:
      const { payload: }  
    return {
        ...state,
        count
      }
  }
}