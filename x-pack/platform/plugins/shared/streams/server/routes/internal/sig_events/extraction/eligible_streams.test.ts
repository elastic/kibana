/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Streams } from '@kbn/streams-schema';
import type { FeaturesRecencyResult } from '../../../../lib/sig_events/features/are_features_recent';
import { classifyStreams, parseExcludePatterns } from './classify_streams';

const STUB_STREAM_FIELDS = {
  description: '',
  updated_at: '2025-01-01T00:00:00Z',
} as const;

const makeStream = (name: string, opts?: { query: boolean }): Streams.all.Definition =>
  opts?.query
    ? {
        name,
        type: 'query' as const,
        query: { esql: `FROM ${name}`, view: name },
        ...STUB_STREAM_FIELDS,
      }
    : {
        name,
        type: 'classic' as const,
        ingest: {
          processing: { steps: [], updated_at: '' },
          lifecycle: { inherit: {} },
          settings: {},
          failure_store: { disabled: {} },
          classic: {},
        },
        ...STUB_STREAM_FIELDS,
      };

const candidateNames = (result: ReturnType<typeof classifyStreams>) =>
  result.candidates.map((c) => c.streamName);

describe('parseExcludePatterns', () => {
  it('splits comma-separated patterns and trims whitespace', () => {
    expect(parseExcludePatterns('debug-*, test-* , logs-*')).toEqual([
      'debug-*',
      'test-*',
      'logs-*',
    ]);
  });

  it('returns empty array for undefined', () => {
    expect(parseExcludePatterns(undefined)).toEqual([]);
  });

  it('returns empty array for empty string', () => {
    expect(parseExcludePatterns('')).toEqual([]);
  });
});

describe('classifyStreams', () => {
  const defaultArgs = {
    allStreams: [] as ReturnType<typeof makeStream>[],
    recencyByStream: new Map<string, FeaturesRecencyResult>(),
    excludedStreamPatterns: '',
  };

  it('skips unsupported stream types and reports them', () => {
    const result = classifyStreams({
      ...defaultArgs,
      allStreams: [makeStream('logs'), makeStream('my-query', { query: true })],
    });

    expect(candidateNames(result)).toEqual(['logs']);
    expect(result.unsupported).toEqual(['my-query']);
  });

  it('excludes streams matching exclude patterns', () => {
    const result = classifyStreams({
      ...defaultArgs,
      allStreams: [makeStream('logs'), makeStream('debug-app'), makeStream('test-data')],
      excludedStreamPatterns: 'debug-*, test-*',
    });

    expect(result.excluded).toEqual(['debug-app', 'test-data']);
    expect(candidateNames(result)).toEqual(['logs']);
  });

  it('treats streams without recency data as candidates', () => {
    const result = classifyStreams({
      ...defaultArgs,
      allStreams: [makeStream('stream-a'), makeStream('stream-b')],
    });

    expect(candidateNames(result)).toEqual(['stream-a', 'stream-b']);
  });

  it('marks streams with recent features as up-to-date', () => {
    const recentLastSeen = new Date().toISOString();
    const recencyByStream = new Map<string, FeaturesRecencyResult>([
      ['fresh-stream', { isRecent: true, newestLastSeen: recentLastSeen }],
    ]);

    const result = classifyStreams({
      ...defaultArgs,
      allStreams: [makeStream('fresh-stream')],
      recencyByStream,
    });

    expect(result.upToDate).toEqual([
      { streamName: 'fresh-stream', lastCompletedAt: recentLastSeen },
    ]);
    expect(result.candidates).toEqual([]);
  });

  it('marks streams with stale features as candidates', () => {
    const oldLastSeen = '2024-01-01T00:00:00Z';
    const recencyByStream = new Map<string, FeaturesRecencyResult>([
      ['old-stream', { isRecent: false, newestLastSeen: oldLastSeen }],
    ]);

    const result = classifyStreams({
      ...defaultArgs,
      allStreams: [makeStream('old-stream')],
      recencyByStream,
    });

    expect(result.candidates).toEqual([{ streamName: 'old-stream', lastCompletedAt: oldLastSeen }]);
  });

  it('marks streams with no features as candidates with null lastCompletedAt', () => {
    const recencyByStream = new Map<string, FeaturesRecencyResult>([
      ['empty-stream', { isRecent: false }],
    ]);

    const result = classifyStreams({
      ...defaultArgs,
      allStreams: [makeStream('empty-stream')],
      recencyByStream,
    });

    expect(result.candidates).toEqual([{ streamName: 'empty-stream', lastCompletedAt: null }]);
  });
});
