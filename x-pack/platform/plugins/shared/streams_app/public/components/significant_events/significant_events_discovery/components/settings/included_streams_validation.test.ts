/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Streams } from '@kbn/streams-schema';
import {
  findUnmatchedIncludePatterns,
  isSupportedStream,
  parseIncludedStreamPatterns,
} from './included_streams_validation';

const makeClassicStream = (name: string): Streams.all.Definition =>
  ({
    name,
    type: 'classic',
    description: '',
    updated_at: '2025-01-01T00:00:00Z',
    ingest: {
      processing: { steps: [], updated_at: '' },
      lifecycle: { inherit: {} },
      settings: {},
      failure_store: { disabled: {} },
      classic: {},
    },
  } as Streams.all.Definition);

describe('parseIncludedStreamPatterns', () => {
  it('splits, trims, and drops empty entries', () => {
    expect(parseIncludedStreamPatterns(' logs.app.* , metrics.* ,, ')).toEqual([
      'logs.app.*',
      'metrics.*',
    ]);
  });

  it('returns an empty array for undefined or empty input', () => {
    expect(parseIncludedStreamPatterns(undefined)).toEqual([]);
    expect(parseIncludedStreamPatterns('')).toEqual([]);
  });
});

describe('isSupportedStream', () => {
  it('accepts a classic stream definition', () => {
    expect(isSupportedStream(makeClassicStream('logs.app'))).toBe(true);
  });

  it('rejects a definition of an unknown type', () => {
    const bogus = { name: 'weird', type: 'group' } as unknown as Streams.all.Definition;
    expect(isSupportedStream(bogus)).toBe(false);
  });
});

describe('findUnmatchedIncludePatterns', () => {
  const names = ['logs.app.a', 'logs.app.b', 'metrics.host'];

  it('returns patterns that match no stream name', () => {
    expect(findUnmatchedIncludePatterns(['logs.app.*', 'traces.*'], names)).toEqual(['traces.*']);
  });

  it('returns an empty array when every pattern matches at least one name', () => {
    expect(findUnmatchedIncludePatterns(['logs.app.*', 'metrics.host'], names)).toEqual([]);
  });

  it('treats an exact non-existent name as unmatched', () => {
    expect(findUnmatchedIncludePatterns(['logs.app.c'], names)).toEqual(['logs.app.c']);
  });

  it('returns an empty array when there are no patterns', () => {
    expect(findUnmatchedIncludePatterns([], names)).toEqual([]);
  });
});
