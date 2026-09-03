/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FeatureUpsert, StreamQuery } from '@kbn/significant-events-schema';
import {
  fromStoredFeature,
  fromStoredQuery,
  toStoredFeature,
  toStoredQuery,
  toTombstone,
} from './serializers';

function makeQuery(overrides: Partial<StreamQuery> = {}): StreamQuery {
  return {
    id: 'q-1',
    title: 'Test query',
    description: 'desc',
    type: 'match',
    esql: { query: 'FROM logs-* | WHERE x == 1' },
    ...overrides,
  };
}

describe('toStoredQuery', () => {
  it('normalizes feature ids so they match the stored feature slug', () => {
    const stored = toStoredQuery('logs.test', makeQuery({ features: [{ id: ' Svc-F ' }] }), false);

    expect(stored.query.features).toEqual([{ id: 'svc-f' }]);
  });

  it('leaves an already-normalized feature id unchanged', () => {
    const stored = toStoredQuery('logs.test', makeQuery({ features: [{ id: 'svc-a' }] }), false);

    expect(stored.query.features).toEqual([{ id: 'svc-a' }]);
  });

  it('leaves a query with no features as undefined', () => {
    const stored = toStoredQuery('logs.test', makeQuery(), false);

    expect(stored.query.features).toBeUndefined();
  });

  it('round-trips a predictive source independently from its compatibility owner', () => {
    const stored = toStoredQuery(
      'code:compat:logs',
      makeQuery(),
      false,
      undefined,
      'code:source:logs'
    );

    expect(stored['stream.name']).toBe('code:compat:logs');
    expect(stored['source.id']).toBe('code:source:logs');
    expect(fromStoredQuery(stored)).toEqual(
      expect.objectContaining({
        stream_name: 'code:compat:logs',
        source_id: 'code:source:logs',
      })
    );
    expect(toTombstone('code:compat:logs', stored)).toEqual(
      expect.objectContaining({
        'stream.name': 'code:compat:logs',
        'source.id': 'code:source:logs',
      })
    );
  });
});

describe('feature source ownership', () => {
  it('round-trips source ids and preserves them in tombstones', () => {
    const feature: FeatureUpsert = {
      id: 'service',
      stream_name: 'code:compat:feature',
      source_ids: ['code:source:one', 'code:source:two'],
      type: 'entity',
      description: 'service',
      properties: {},
      confidence: 90,
    };
    const stored = toStoredFeature(feature.stream_name, feature, false);

    expect(fromStoredFeature(stored).source_ids).toEqual(feature.source_ids);
    expect(toTombstone(feature.stream_name, stored)['source.ids']).toEqual(feature.source_ids);
  });
});
