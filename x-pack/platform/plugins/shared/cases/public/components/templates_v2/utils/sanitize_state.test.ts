/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_QUERY_PARAMS } from '../constants';
import { sanitizeState } from './sanitize_state';

describe('sanitizeState', () => {
  it('sanitizes default state correctly', () => {
    expect(sanitizeState(DEFAULT_QUERY_PARAMS)).toEqual(DEFAULT_QUERY_PARAMS);
  });

  it('returns empty object with no arguments', () => {
    expect(sanitizeState()).toEqual({});
  });

  it('sanitizes perPage if it is bigger than 100', () => {
    expect(sanitizeState({ perPage: 1000 })).toEqual({ perPage: 100 });
  });

  it('sanitizes perPage to max allowed value', () => {
    expect(sanitizeState({ perPage: 500 })).toEqual({ perPage: 100 });
  });

  it('keeps valid perPage values', () => {
    expect(sanitizeState({ perPage: 25 })).toEqual({ perPage: 25 });
  });

  it('sanitizes invalid sortOrder to default', () => {
    // @ts-expect-error: testing invalid value
    expect(sanitizeState({ sortOrder: 'invalid' })).toEqual({ sortOrder: 'asc' });
  });

  it('keeps valid sortOrder values', () => {
    expect(sanitizeState({ sortOrder: 'desc' })).toEqual({ sortOrder: 'desc' });
    expect(sanitizeState({ sortOrder: 'asc' })).toEqual({ sortOrder: 'asc' });
  });

  it('sanitizes tags to filter out falsy values', () => {
    // @ts-expect-error: testing invalid values
    expect(sanitizeState({ tags: ['valid', '', null, undefined, 'another'] })).toEqual({
      tags: ['valid', 'another'],
    });
  });

  it('keeps valid tags array', () => {
    expect(sanitizeState({ tags: ['tag1', 'tag2'] })).toEqual({ tags: ['tag1', 'tag2'] });
  });

  it('converts non-array tags to empty array', () => {
    // @ts-expect-error: testing invalid value
    expect(sanitizeState({ tags: 'not-an-array' })).toEqual({ tags: [] });
  });

  it('sanitizes author to filter out falsy values', () => {
    // @ts-expect-error: testing invalid values
    expect(sanitizeState({ author: ['user1', '', null, 'user2'] })).toEqual({
      author: ['user1', 'user2'],
    });
  });

  it('keeps valid author array', () => {
    expect(sanitizeState({ author: ['user1', 'user2'] })).toEqual({
      author: ['user1', 'user2'],
    });
  });

  it('converts non-array author to empty array', () => {
    // @ts-expect-error: testing invalid value
    expect(sanitizeState({ author: 'not-an-array' })).toEqual({ author: [] });
  });

  it('preserves other valid fields', () => {
    expect(sanitizeState({ page: 5, search: 'test' })).toEqual({ page: 5, search: 'test' });
  });

  it('sanitizes multiple fields at once', () => {
    expect(
      sanitizeState({
        perPage: 500,
        // @ts-expect-error: testing invalid value
        sortOrder: 'invalid',
        tags: ['valid'],
        page: 2,
      })
    ).toEqual({
      perPage: 100,
      sortOrder: 'asc',
      tags: ['valid'],
      page: 2,
    });
  });
});
