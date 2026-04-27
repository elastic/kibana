/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Index } from '../../../../common';
import {
  clearRowStatus,
  closeIndicesStart,
  openIndicesStart,
  reloadIndicesSuccess,
} from '../actions';
import {
  INDEX_CLOSED,
  INDEX_CLOSING,
  INDEX_OPEN,
  INDEX_OPENING,
} from '../../../../common/constants';
import { rowStatus } from './row_status';

describe('row_status reducer', () => {
  test('sets statuses on close/open start actions', () => {
    const state = {};

    expect(rowStatus(state, closeIndicesStart({ indexNames: ['a'] }))).toEqual({
      a: INDEX_CLOSING,
    });
    expect(rowStatus(state, openIndicesStart({ indexNames: ['b', 'c'] }))).toEqual({
      b: INDEX_OPENING,
      c: INDEX_OPENING,
    });
  });

  test('clears statuses for specified indices', () => {
    const state = { a: INDEX_CLOSING, b: INDEX_OPENING };
    expect(rowStatus(state, clearRowStatus({ indexNames: ['a'] }))).toEqual({ b: INDEX_OPENING });
  });

  test('removes completed statuses on reloadIndicesSuccess', () => {
    const state = { a: INDEX_CLOSING, b: INDEX_OPENING };
    const indices: Index[] = [
      { name: 'a', status: INDEX_CLOSED },
      { name: 'b', status: INDEX_OPEN },
    ];

    expect(rowStatus(state, reloadIndicesSuccess({ indices }))).toEqual({});
  });

  test('removes statuses for indices that no longer exist in the refreshed list', () => {
    const state = { a: INDEX_CLOSING, missing: INDEX_OPENING };
    const indices: Index[] = [{ name: 'a', status: INDEX_OPEN }];

    expect(rowStatus(state, reloadIndicesSuccess({ indices }))).toEqual({ a: INDEX_CLOSING });
  });
});
