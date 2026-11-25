/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DEFAULT_EPISODES_TABLE_SORT,
  episodesTableConfigSchema,
  resolveEpisodesTableVisibleColumns,
  resolveSortForVisibleColumns,
} from './episodes_table_config';

describe('episodesTableConfigSchema', () => {
  it('accepts an empty visibleColumns list', () => {
    expect(episodesTableConfigSchema.shape.visibleColumns.safeParse([]).success).toBe(true);
  });
});

describe('resolveEpisodesTableVisibleColumns', () => {
  it('returns undefined for a non-array value', () => {
    expect(resolveEpisodesTableVisibleColumns(undefined)).toBeUndefined();
    expect(resolveEpisodesTableVisibleColumns('tags')).toBeUndefined();
  });

  it('keeps known ids in stored order and drops unknown ones', () => {
    expect(resolveEpisodesTableVisibleColumns(['tags', 'unknown.field', 'severity'])).toEqual([
      'tags',
      'severity',
    ]);
  });

  it('removes duplicate ids', () => {
    expect(resolveEpisodesTableVisibleColumns(['tags', 'tags', 'reason'])).toEqual([
      'tags',
      'reason',
    ]);
  });

  it('returns undefined when every stored id is unknown', () => {
    expect(resolveEpisodesTableVisibleColumns(['unknown.field'])).toBeUndefined();
  });

  it('keeps an empty selection', () => {
    expect(resolveEpisodesTableVisibleColumns([])).toEqual([]);
  });

  it('drops the always-shown time column from a stored selection', () => {
    expect(resolveEpisodesTableVisibleColumns(['@timestamp', 'tags'])).toEqual(['tags']);
  });
});

describe('resolveSortForVisibleColumns', () => {
  it('keeps a sort on a visible column', () => {
    const sort = { sortField: 'duration', sortDirection: 'asc' as const };
    expect(resolveSortForVisibleColumns(sort, ['duration'])).toBe(sort);
  });

  it('falls back to the default when the sorted column is hidden', () => {
    const sort = { sortField: 'duration', sortDirection: 'asc' as const };
    expect(resolveSortForVisibleColumns(sort, ['tags'])).toBe(DEFAULT_EPISODES_TABLE_SORT);
  });

  it('keeps a time sort, since the time column is always shown', () => {
    const sort = { sortField: '@timestamp', sortDirection: 'asc' as const };
    expect(resolveSortForVisibleColumns(sort, ['tags'])).toBe(sort);
  });
});
