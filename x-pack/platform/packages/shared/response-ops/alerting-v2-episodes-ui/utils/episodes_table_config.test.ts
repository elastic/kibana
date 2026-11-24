/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DEFAULT_EPISODES_TABLE_SORT,
  DEFAULT_EPISODES_TABLE_VISIBLE_COLUMNS,
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
  it('returns the defaults for a non-array value', () => {
    expect(resolveEpisodesTableVisibleColumns(undefined)).toEqual(
      DEFAULT_EPISODES_TABLE_VISIBLE_COLUMNS
    );
    expect(resolveEpisodesTableVisibleColumns('tags')).toEqual(
      DEFAULT_EPISODES_TABLE_VISIBLE_COLUMNS
    );
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

  it('returns the defaults when every stored id is unknown', () => {
    expect(resolveEpisodesTableVisibleColumns(['unknown.field'])).toEqual(
      DEFAULT_EPISODES_TABLE_VISIBLE_COLUMNS
    );
  });

  it('keeps an empty or time-only selection', () => {
    expect(resolveEpisodesTableVisibleColumns([])).toEqual([]);
    expect(resolveEpisodesTableVisibleColumns(['@timestamp'])).toEqual(['@timestamp']);
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

  it('falls back to the default for an oldest-first sort on a hidden time column', () => {
    const sort = { sortField: '@timestamp', sortDirection: 'asc' as const };
    expect(resolveSortForVisibleColumns(sort, ['tags'])).toBe(DEFAULT_EPISODES_TABLE_SORT);
  });

  it('keeps the default sort on a hidden time column', () => {
    const sort = { sortField: '@timestamp', sortDirection: 'desc' as const };
    expect(resolveSortForVisibleColumns(sort, ['tags'])).toEqual(DEFAULT_EPISODES_TABLE_SORT);
  });
});
