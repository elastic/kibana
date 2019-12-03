/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { createContext } from 'react';
import { SnapshotState } from '../state/reducers/snapshot';
import { SnapshotActionTypes } from '../state/actions';

export const snapshotInitialState: SnapshotState & {
  dispatch: React.Dispatch<SnapshotActionTypes>;
} = {
  count: {
    down: 0,
    mixed: 0,
    total: 0,
    up: 0,
  },
  dispatch: (action: any) => {},
  errors: [],
  loading: false,
};

export const SnapshotContext = createContext({
  ...snapshotInitialState,
});
