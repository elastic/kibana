/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseEpisodeDataJson, getValueByFieldPath } from './episode_data';

describe('parseEpisodeDataJson', () => {
  it('parses a valid JSON object string', () => {
    expect(parseEpisodeDataJson('{"host.name":"web-01"}')).toEqual({ 'host.name': 'web-01' });
  });

  it('returns {} for non-string input', () => {
    expect(parseEpisodeDataJson(null)).toEqual({});
    expect(parseEpisodeDataJson(undefined)).toEqual({});
    expect(parseEpisodeDataJson(42)).toEqual({});
  });

  it('returns {} for empty string', () => {
    expect(parseEpisodeDataJson('')).toEqual({});
  });

  it('returns {} for malformed JSON', () => {
    expect(parseEpisodeDataJson('{bad')).toEqual({});
  });

  it('returns {} for non-object JSON values', () => {
    expect(parseEpisodeDataJson('"just a string"')).toEqual({});
    expect(parseEpisodeDataJson('[1,2,3]')).toEqual({});
  });
});

describe('getValueByFieldPath', () => {
  it('reads a flattened top-level key', () => {
    expect(getValueByFieldPath({ 'host.name': 'web-01' }, 'host.name')).toBe('web-01');
  });

  it('walks nested objects when no flattened key exists', () => {
    expect(getValueByFieldPath({ host: { name: 'web-02' } }, 'host.name')).toBe('web-02');
  });

  it('prefers a flattened key over a nested path', () => {
    expect(
      getValueByFieldPath({ 'host.name': 'flat', host: { name: 'nested' } }, 'host.name')
    ).toBe('flat');
  });

  it('returns undefined for a missing path', () => {
    expect(getValueByFieldPath({}, 'host.name')).toBeUndefined();
  });
});
