/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndicesGetDataStreamResponse } from '@elastic/elasticsearch/lib/api/types';
import { getAllBackingIndicesByStream, getLastBackingIndexByStream } from './utils';

type DataStreams = IndicesGetDataStreamResponse['data_streams'];

const makeDataStream = (name: string, indexNames: Array<string | undefined>): DataStreams[number] =>
  ({
    name,
    indices: indexNames.map((index_name) => ({ index_name })),
  } as DataStreams[number]);

describe('getAllBackingIndicesByStream', () => {
  it('returns all backing indices for each stream, not just the write index', () => {
    const dataStreams = [
      makeDataStream('logs-foo', [
        '.ds-logs-foo-000001',
        '.ds-logs-foo-000002',
        '.ds-logs-foo-000003',
      ]),
      makeDataStream('logs-bar', ['.ds-logs-bar-000001']),
    ];

    const result = getAllBackingIndicesByStream(dataStreams);

    expect(result.get('logs-foo')).toEqual([
      '.ds-logs-foo-000001',
      '.ds-logs-foo-000002',
      '.ds-logs-foo-000003',
    ]);
    expect(result.get('logs-bar')).toEqual(['.ds-logs-bar-000001']);
  });

  it('includes rolled-over indices so totals span every phase (hot + frozen)', () => {
    // Mimics a DLM stream where older backing indices have been mounted as frozen searchable snapshots.
    const dataStreams = [
      makeDataStream('my-stream', [
        'dlm-frozen-.ds-my-stream-000001',
        'dlm-frozen-.ds-my-stream-000002',
        '.ds-my-stream-000003',
      ]),
    ];

    const result = getAllBackingIndicesByStream(dataStreams);

    expect(result.get('my-stream')).toEqual([
      'dlm-frozen-.ds-my-stream-000001',
      'dlm-frozen-.ds-my-stream-000002',
      '.ds-my-stream-000003',
    ]);
  });

  it('filters out indices with a missing index_name', () => {
    const dataStreams = [
      makeDataStream('logs-foo', ['.ds-logs-foo-000001', undefined, '.ds-logs-foo-000002']),
    ];

    const result = getAllBackingIndicesByStream(dataStreams);

    expect(result.get('logs-foo')).toEqual(['.ds-logs-foo-000001', '.ds-logs-foo-000002']);
  });

  it('omits streams that have no backing indices with a name', () => {
    const dataStreams = [
      makeDataStream('empty-stream', []),
      makeDataStream('nameless-stream', [undefined]),
      makeDataStream('logs-foo', ['.ds-logs-foo-000001']),
    ];

    const result = getAllBackingIndicesByStream(dataStreams);

    expect(result.has('empty-stream')).toBe(false);
    expect(result.has('nameless-stream')).toBe(false);
    expect(result.get('logs-foo')).toEqual(['.ds-logs-foo-000001']);
  });

  it('returns an empty map when there are no data streams', () => {
    expect(getAllBackingIndicesByStream([])).toEqual(new Map());
  });
});

describe('getLastBackingIndexByStream', () => {
  it('returns only the write (last) backing index per stream', () => {
    const dataStreams = [
      makeDataStream('logs-foo', [
        '.ds-logs-foo-000001',
        '.ds-logs-foo-000002',
        '.ds-logs-foo-000003',
      ]),
    ];

    const result = getLastBackingIndexByStream(dataStreams);

    expect(result.get('logs-foo')).toBe('.ds-logs-foo-000003');
  });

  it('omits streams with no backing indices', () => {
    const dataStreams = [makeDataStream('empty-stream', [])];

    const result = getLastBackingIndexByStream(dataStreams);

    expect(result.has('empty-stream')).toBe(false);
  });
});
