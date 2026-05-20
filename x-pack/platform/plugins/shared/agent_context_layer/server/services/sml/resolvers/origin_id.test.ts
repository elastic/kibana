/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseOriginId, formatOriginId } from './origin_id';

describe('parseOriginId', () => {
  it('parses a prefixed origin id into scheme and path', () => {
    expect(parseOriginId('kibana://lens/abc-123')).toEqual({
      scheme: 'kibana',
      path: 'lens/abc-123',
    });
  });

  it('returns no scheme for a bare local id (backward-compat path)', () => {
    expect(parseOriginId('plain-id')).toEqual({ path: 'plain-id' });
  });

  it('preserves multi-segment paths (only the first `://` separator splits)', () => {
    expect(parseOriginId('es_document://my-index/doc-with/slashes')).toEqual({
      scheme: 'es_document',
      path: 'my-index/doc-with/slashes',
    });
  });

  it('rejects strings that look like URIs but use an invalid scheme (uppercase)', () => {
    // Uppercase schemes do not match the registry pattern; we treat the whole
    // string as a bare path so callers see "no resolver" rather than a
    // mismatched lookup.
    expect(parseOriginId('Kibana://lens/abc')).toEqual({ path: 'Kibana://lens/abc' });
  });

  it('parses empty path component as empty string after `://`', () => {
    expect(parseOriginId('kibana://')).toEqual({ scheme: 'kibana', path: '' });
  });

  it('handles paths containing colons', () => {
    expect(parseOriginId('kibana://lens/abc:def')).toEqual({
      scheme: 'kibana',
      path: 'lens/abc:def',
    });
  });
});

describe('formatOriginId', () => {
  it('joins scheme and path with `://`', () => {
    expect(formatOriginId('kibana', 'lens/abc-123')).toBe('kibana://lens/abc-123');
  });

  it('round-trips with parseOriginId for valid inputs', () => {
    const original = 'es_index://logs-app-2024';
    expect(formatOriginId('es_index', 'logs-app-2024')).toBe(original);
    expect(parseOriginId(original)).toEqual({ scheme: 'es_index', path: 'logs-app-2024' });
  });

  it('throws on an invalid scheme', () => {
    expect(() => formatOriginId('Kibana', 'lens/abc')).toThrow(/Invalid SML resolver scheme/);
    expect(() => formatOriginId('1bad', 'lens/abc')).toThrow(/Invalid SML resolver scheme/);
    expect(() => formatOriginId('', 'lens/abc')).toThrow(/Invalid SML resolver scheme/);
  });
});
