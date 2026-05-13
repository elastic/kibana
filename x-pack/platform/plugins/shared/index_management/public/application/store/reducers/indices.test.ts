/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Index } from '../../../../common';
import type { HttpError, IndicesState } from '../types';
import {
  deleteIndicesSuccess,
  loadIndicesEnrichmentError,
  loadIndicesError,
  loadIndicesStart,
  loadIndicesSuccess,
  reloadIndicesSuccess,
} from '../actions';
import { indices } from './indices';

const createState = (overrides: Partial<IndicesState> = {}): IndicesState => ({
  byId: {},
  allIds: [],
  loading: true,
  error: false,
  enrichmentErrors: [],
  ...overrides,
});

describe('indices reducer', () => {
  test('resets loading/error/enrichmentErrors on loadIndicesStart', () => {
    const error: HttpError = { status: 500, body: { error: 'Error', message: 'boom' } };
    const state = createState({
      loading: false,
      error,
      enrichmentErrors: ['enricherA'],
      allIds: ['a'],
      byId: { a: { name: 'a' } },
    });

    expect(indices(state, loadIndicesStart())).toEqual({
      ...state,
      loading: true,
      error: false,
      enrichmentErrors: [],
    });
  });

  test('stores enrichment errors uniquely', () => {
    const state = createState({ enrichmentErrors: ['enricherA'] });
    expect(
      indices(state, loadIndicesEnrichmentError({ source: 'enricherA' })).enrichmentErrors
    ).toEqual(['enricherA']);
    expect(
      indices(state, loadIndicesEnrichmentError({ source: 'enricherB' })).enrichmentErrors
    ).toEqual(['enricherA', 'enricherB']);
  });

  test('populates byId/allIds and clears error on loadIndicesSuccess', () => {
    const state = createState({ loading: true, error: { status: 500, body: { error: 'Error' } } });
    const indicesPayload: Index[] = [{ name: 'a' }, { name: 'b' }];

    expect(indices(state, loadIndicesSuccess({ indices: indicesPayload }))).toEqual({
      ...state,
      loading: false,
      error: false,
      byId: {
        a: { name: 'a' },
        b: { name: 'b' },
      },
      allIds: ['a', 'b'],
    });
  });

  test('stores loadIndicesError payload and turns off loading', () => {
    const state = createState({ loading: true });
    const error: HttpError = {
      status: 403,
      body: { error: 'Forbidden', message: 'No privileges' },
    };

    expect(indices(state, loadIndicesError(error))).toEqual({
      ...state,
      loading: false,
      error,
    });
  });

  test('removes indices on deleteIndicesSuccess', () => {
    const state = createState({
      loading: false,
      allIds: ['a', 'b'],
      byId: { a: { name: 'a' }, b: { name: 'b' } },
    });

    expect(indices(state, deleteIndicesSuccess({ indexNames: ['a'] }))).toEqual({
      ...state,
      byId: { b: { name: 'b' } },
      allIds: ['b'],
    });
  });

  test('merges updated indices on reloadIndicesSuccess without changing allIds', () => {
    const state = createState({
      loading: false,
      allIds: ['a', 'b'],
      byId: { a: { name: 'a', documents: 1 }, b: { name: 'b' } },
    });

    expect(
      indices(state, reloadIndicesSuccess({ indices: [{ name: 'a', documents: 2 }] }))
    ).toEqual({
      ...state,
      byId: { a: { name: 'a', documents: 2 }, b: { name: 'b' } },
      allIds: ['a', 'b'],
    });
  });
});
