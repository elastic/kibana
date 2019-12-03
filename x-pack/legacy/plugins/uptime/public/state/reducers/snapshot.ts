/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Snapshot } from '../../../common/runtime_types';
import {
  FETCH_SNAPSHOT_COUNT,
  FETCH_SNAPSHOT_COUNT_FAIL,
  FETCH_SNAPSHOT_COUNT_SUCCESS,
  SnapshotActionTypes,
} from '../actions';

export interface SnapshotState {
  count: Snapshot;
  errors: any[];
  loading: boolean;
}

const initialState: SnapshotState = {
  count: {
    down: 0,
    mixed: 0,
    total: 0,
    up: 0,
  },
  errors: [],
  loading: false,
};

export function snapshotReducer(state = initialState, action: SnapshotActionTypes): SnapshotState {
  switch (action.type) {
    case FETCH_SNAPSHOT_COUNT:
      return {
        ...state,
        loading: true,
      };
    case FETCH_SNAPSHOT_COUNT_SUCCESS:
      return {
        ...state,
        count: action.payload,
        loading: false,
      };
    case FETCH_SNAPSHOT_COUNT_FAIL:
      return {
        ...state,
        errors: [...state.errors, action.payload],
      };
    default:
      return state;
  }
}
