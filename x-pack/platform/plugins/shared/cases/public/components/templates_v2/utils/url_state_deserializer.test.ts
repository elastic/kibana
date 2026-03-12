/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_QUERY_PARAMS } from '../constants';
import { templatesUrlStateDeserializer } from './url_state_deserializer';

describe('templatesUrlStateDeserializer', () => {
  it('returns empty object for empty input', () => {
    expect(templatesUrlStateDeserializer({})).toEqual({});
  });

  it('parses page as integer', () => {
    const result = templatesUrlStateDeserializer({ page: '5' as unknown as number });

    expect(result.page).toBe(5);
  });

  it('returns default page for invalid value', () => {
    const result = templatesUrlStateDeserializer({ page: 'invalid' as unknown as number });

    expect(result.page).toBe(DEFAULT_QUERY_PARAMS.page);
  });

  it('parses perPage as integer', () => {
    const result = templatesUrlStateDeserializer({ perPage: '25' as unknown as number });

    expect(result.perPage).toBe(25);
  });

  it('returns default perPage for invalid value', () => {
    const result = templatesUrlStateDeserializer({ perPage: 'invalid' as unknown as number });

    expect(result.perPage).toBe(DEFAULT_QUERY_PARAMS.perPage);
  });

  it('decodes search string', () => {
    const result = templatesUrlStateDeserializer({ search: 'test%20query' });

    expect(result.search).toBe('test query');
  });

  it('preserves tags array', () => {
    const result = templatesUrlStateDeserializer({ tags: ['tag1', 'tag2'] });

    expect(result.tags).toEqual(['tag1', 'tag2']);
  });

  it('preserves author array', () => {
    const result = templatesUrlStateDeserializer({ author: ['user1', 'user2'] });

    expect(result.author).toEqual(['user1', 'user2']);
  });

  it('preserves sortField', () => {
    const result = templatesUrlStateDeserializer({ sortField: 'lastUsedAt' });

    expect(result.sortField).toBe('lastUsedAt');
  });

  it('sanitizes invalid sortOrder', () => {
    const result = templatesUrlStateDeserializer({ sortOrder: 'invalid' as 'asc' | 'desc' });

    expect(result.sortOrder).toBe(DEFAULT_QUERY_PARAMS.sortOrder);
  });

  it('preserves valid sortOrder', () => {
    const result = templatesUrlStateDeserializer({ sortOrder: 'desc' });

    expect(result.sortOrder).toBe('desc');
  });

  it('ignores unknown fields', () => {
    const result = templatesUrlStateDeserializer({
      page: 2,
      unknownField: 'value',
    } as Record<string, unknown>);

    expect(result).toEqual({ page: 2 });
    expect((result as Record<string, unknown>).unknownField).toBeUndefined();
  });
});
