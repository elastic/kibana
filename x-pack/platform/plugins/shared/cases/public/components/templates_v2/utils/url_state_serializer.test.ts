/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_QUERY_PARAMS } from '../constants';
import { templatesUrlStateSerializer } from './url_state_serializer';

describe('templatesUrlStateSerializer', () => {
  it('serializes default state correctly', () => {
    const result = templatesUrlStateSerializer(DEFAULT_QUERY_PARAMS);

    expect(result).toEqual({
      page: 1,
      perPage: 10,
      sortField: 'name',
      sortOrder: 'asc',
    });
  });

  it('filters out empty search string', () => {
    const result = templatesUrlStateSerializer({
      ...DEFAULT_QUERY_PARAMS,
      search: '',
    });

    expect(result.search).toBeUndefined();
  });

  it('encodes search string', () => {
    const result = templatesUrlStateSerializer({
      ...DEFAULT_QUERY_PARAMS,
      search: 'test query',
    });

    expect(result.search).toBe('test%20query');
  });

  it('filters out empty tags array', () => {
    const result = templatesUrlStateSerializer({
      ...DEFAULT_QUERY_PARAMS,
      tags: [],
    });

    expect(result.tags).toBeUndefined();
  });

  it('includes non-empty tags array', () => {
    const result = templatesUrlStateSerializer({
      ...DEFAULT_QUERY_PARAMS,
      tags: ['tag1', 'tag2'],
    });

    expect(result.tags).toEqual(['tag1', 'tag2']);
  });

  it('filters out empty author array', () => {
    const result = templatesUrlStateSerializer({
      ...DEFAULT_QUERY_PARAMS,
      author: [],
    });

    expect(result.author).toBeUndefined();
  });

  it('includes non-empty author array', () => {
    const result = templatesUrlStateSerializer({
      ...DEFAULT_QUERY_PARAMS,
      author: ['user1', 'user2'],
    });

    expect(result.author).toEqual(['user1', 'user2']);
  });

  it('preserves numeric values', () => {
    const result = templatesUrlStateSerializer({
      ...DEFAULT_QUERY_PARAMS,
      page: 5,
      perPage: 25,
    });

    expect(result.page).toBe(5);
    expect(result.perPage).toBe(25);
  });
});
