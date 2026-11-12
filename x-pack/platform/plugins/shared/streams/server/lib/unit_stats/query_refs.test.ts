/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamsUnit } from '@kbn/streams-schema';
import { noDestinationStats } from './mappers/map_destination_stats_result';
import { noProcessorStats } from './mappers/map_processor_stats_result';
import { noSourceStats } from './mappers/map_source_stats_result';
import { defaultResults, resolveQueryRefs } from './query_refs';

const unit: StreamsUnit.Configuration = {
  sources: [{ id: 'otlp-input', type: 'otlp', supported_telemetry: ['logs'] }],
  destinations: [
    { id: 'es-prod', type: 'elasticsearch', supported_telemetry: ['logs'] },
    { id: 'archive', type: 's3', supported_telemetry: ['logs'] },
  ],
  processors: [{ id: 'uppercase-message', type: 'add_fields', supported_telemetry: ['logs'] }],
  pipelines: [],
};

describe('resolveQueryRefs', () => {
  it('gives a destination of the unit its type, and keeps its kind and id', () => {
    const { queryable, unqueryable } = resolveQueryRefs({
      refs: [
        { kind: 'destination', id: 'es-prod' },
        { kind: 'destination', id: 'archive' },
      ],
      unit,
    });

    expect(queryable).toEqual([
      { kind: 'destination', id: 'es-prod', type: 'elasticsearch' },
      { kind: 'destination', id: 'archive', type: 's3' },
    ]);
    expect(unqueryable).toEqual([]);
  });

  it('keeps a processor and a source of the unit as the request sent them', () => {
    const refs: StreamsUnit.StatsComponentRef[] = [
      { kind: 'processor', id: 'uppercase-message' },
      { kind: 'source', id: 'otlp-input' },
    ];

    const { queryable, unqueryable } = resolveQueryRefs({ refs, unit });

    expect(queryable).toEqual(refs);
    expect(unqueryable).toEqual([]);
  });

  it('puts a ref that the unit does not have in the unqueryable list, of any kind', () => {
    const refs: StreamsUnit.StatsComponentRef[] = [
      { kind: 'destination', id: 'gone' },
      { kind: 'processor', id: 'gone' },
      { kind: 'source', id: 'gone' },
    ];

    const { queryable, unqueryable } = resolveQueryRefs({ refs, unit });

    expect(queryable).toEqual([]);
    expect(unqueryable).toEqual(refs);
  });

  it('tells the kinds apart, so an id that is only a destination is not a processor', () => {
    const { queryable, unqueryable } = resolveQueryRefs({
      refs: [
        { kind: 'processor', id: 'es-prod' },
        { kind: 'destination', id: 'es-prod' },
      ],
      unit,
    });

    expect(queryable).toEqual([{ kind: 'destination', id: 'es-prod', type: 'elasticsearch' }]);
    expect(unqueryable).toEqual([{ kind: 'processor', id: 'es-prod' }]);
  });

  it('keeps the order of the request in both lists', () => {
    const { queryable, unqueryable } = resolveQueryRefs({
      refs: [
        { kind: 'destination', id: 'gone-1' },
        { kind: 'source', id: 'otlp-input' },
        { kind: 'destination', id: 'archive' },
        { kind: 'processor', id: 'gone-2' },
        { kind: 'destination', id: 'es-prod' },
      ],
      unit,
    });

    expect(queryable.map(({ id }) => id)).toEqual(['otlp-input', 'archive', 'es-prod']);
    expect(unqueryable.map(({ id }) => id)).toEqual(['gone-1', 'gone-2']);
  });

  it('does not read the prototype for an id like "constructor"', () => {
    const { queryable, unqueryable } = resolveQueryRefs({
      refs: [
        { kind: 'destination', id: 'constructor' },
        { kind: 'processor', id: 'constructor' },
        { kind: 'source', id: 'constructor' },
      ],
      unit,
    });

    expect(queryable).toEqual([]);
    expect(unqueryable).toHaveLength(3);
  });

  it('has nothing to query when the unit has no components', () => {
    const { queryable, unqueryable } = resolveQueryRefs({
      refs: [{ kind: 'destination', id: 'es-prod' }],
      unit: { sources: [], destinations: [], pipelines: [] },
    });

    expect(queryable).toEqual([]);
    expect(unqueryable).toEqual([{ kind: 'destination', id: 'es-prod' }]);
  });
});

describe('defaultResults', () => {
  const bucketMs = 60_000;
  const notFound = expect.objectContaining({ code: 'not_found' });

  const resultsFor = (refs: StreamsUnit.StatsComponentRef[]) => {
    const { unqueryable } = resolveQueryRefs({ refs, unit });
    return defaultResults({ refs, unqueryable, bucketMs });
  };

  it('starts a ref that the unit has as no data, with no error', () => {
    const results = resultsFor([
      { kind: 'destination', id: 'es-prod' },
      { kind: 'processor', id: 'uppercase-message' },
      { kind: 'source', id: 'otlp-input' },
    ]);

    expect(results.destinations['es-prod']).toEqual(noDestinationStats(bucketMs));
    expect(results.processors['uppercase-message']).toEqual(noProcessorStats());
    expect(results.sources['otlp-input']).toEqual(noSourceStats());
  });

  it('gives a ref that the unit does not have no data and a not_found error, of each kind', () => {
    const results = resultsFor([
      { kind: 'destination', id: 'gone' },
      { kind: 'processor', id: 'gone' },
      { kind: 'source', id: 'gone' },
    ]);

    expect(results.destinations.gone).toEqual({
      ...noDestinationStats(bucketMs),
      error: notFound,
    });
    expect(results.processors.gone).toEqual({ ...noProcessorStats(), error: notFound });
    expect(results.sources.gone).toEqual({ ...noSourceStats(), error: notFound });
  });

  it('keeps the order of the request in each map', () => {
    const results = resultsFor([
      { kind: 'destination', id: 'gone' },
      { kind: 'destination', id: 'es-prod' },
      { kind: 'processor', id: 'uppercase-message' },
      { kind: 'destination', id: 'archive' },
    ]);

    expect(Object.keys(results.destinations)).toEqual(['gone', 'es-prod', 'archive']);
    expect(Object.keys(results.processors)).toEqual(['uppercase-message']);
    expect(Object.keys(results.sources)).toEqual([]);
  });

  it('uses the bucket size for the empty series of a destination', () => {
    const results = resultsFor([{ kind: 'destination', id: 'es-prod' }]);

    expect(results.destinations['es-prod'].events.incoming.series.bucket_ms).toBe(bucketMs);
  });

  it('has nothing for a request with no refs', () => {
    expect(resultsFor([])).toEqual({ destinations: {}, processors: {}, sources: {} });
  });

  it('drops a kind that the API does not know, so a new kind never breaks a request', () => {
    const unknownKind = { kind: 'pipeline', id: 'main' } as never;

    const results = resultsFor([unknownKind, { kind: 'destination', id: 'es-prod' }]);

    expect(Object.keys(results.destinations)).toEqual(['es-prod']);
    expect(results.processors).toEqual({});
    expect(results.sources).toEqual({});
  });
});
