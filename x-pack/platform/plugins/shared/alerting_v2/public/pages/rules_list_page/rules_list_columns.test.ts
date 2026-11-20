/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_VISIBLE_COLUMN_IDS, resolveVisibleColumnIds } from './rules_list_columns';

describe('resolveVisibleColumnIds', () => {
  it('returns the defaults when nothing is stored', () => {
    expect(resolveVisibleColumnIds(undefined)).toEqual(DEFAULT_VISIBLE_COLUMN_IDS);
  });

  it('returns the defaults when the stored value is not an array', () => {
    expect(resolveVisibleColumnIds('kind')).toEqual(DEFAULT_VISIBLE_COLUMN_IDS);
    expect(resolveVisibleColumnIds({ kind: true })).toEqual(DEFAULT_VISIBLE_COLUMN_IDS);
  });

  it('keeps an empty list so "Hide all" survives a reload', () => {
    expect(resolveVisibleColumnIds([])).toEqual([]);
  });

  it('returns the defaults when every stored id is unknown', () => {
    expect(resolveVisibleColumnIds(['ruleName', 'lastRun'])).toEqual(DEFAULT_VISIBLE_COLUMN_IDS);
  });

  it('drops unknown ids and keeps the stored order of known ones', () => {
    expect(resolveVisibleColumnIds(['enabled', 'removedColumn', 'source', 42])).toEqual([
      'enabled',
      'source',
    ]);
  });

  it('removes duplicate ids', () => {
    expect(resolveVisibleColumnIds(['kind', 'kind', 'tags'])).toEqual(['kind', 'tags']);
  });
});
