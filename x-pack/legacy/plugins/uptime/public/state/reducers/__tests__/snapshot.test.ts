/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { snapshotReducer } from '../snapshot';
import { SnapshotActionTypes } from '../../actions';

describe('snapshot reducer', () => {
  it('updates existing state', () => {
    const action: SnapshotActionTypes = {
      type: 'FETCH_SNAPSHOT_COUNT',
      payload: {
        dateRangeStart: 'now-15m',
        dateRangeEnd: 'now',
        filters: 'foo: bar',
        statusFilter: 'up',
      },
    };
    expect(
      snapshotReducer(
        {
          count: { down: 1, total: 4, up: 3 },
          errors: [],
          loading: false,
        },
        action
      )
    ).toMatchSnapshot();
  });

  it(`sets the state's status to loading during a fetch`, () => {
    const action: SnapshotActionTypes = {
      type: 'FETCH_SNAPSHOT_COUNT',
      payload: {
        dateRangeStart: 'now-15m',
        dateRangeEnd: 'now',
      },
    };
    expect(snapshotReducer(undefined, action)).toMatchSnapshot();
  });

  it('changes the count when a snapshot fetch succeeds', () => {
    const action: SnapshotActionTypes = {
      type: 'FETCH_SNAPSHOT_COUNT_SUCCESS',
      payload: {
        up: 10,
        down: 15,
        total: 25,
      },
    };
    expect(snapshotReducer(undefined, action)).toMatchSnapshot();
  });

  it('appends a current error to existing errors list', () => {
    const action: SnapshotActionTypes = {
      type: 'FETCH_SNAPSHOT_COUNT_FAIL',
      payload: new Error(`I couldn't get your data because the server denied the request`),
    };
    expect(snapshotReducer(undefined, action)).toMatchSnapshot();
  });
});
