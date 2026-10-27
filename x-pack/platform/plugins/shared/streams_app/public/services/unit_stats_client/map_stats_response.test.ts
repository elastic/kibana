/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamsUnit } from '@kbn/streams-schema';
import { streamsUnitStatsResponseSchema } from '@kbn/streams-schema';
import { STATS_FIXTURE_RESPONSES } from './fixture_unit_stats_client';
import type { StatsFixtureScenario } from './fixture_unit_stats_client';
import { mapStatsResponse } from './map_stats_response';

const destination = (id: string): StreamsUnit.StatsComponentRef => ({ kind: 'destination', id });
const processor = (id: string): StreamsUnit.StatsComponentRef => ({ kind: 'processor', id });

const map = (scenario: StatsFixtureScenario, requested: StreamsUnit.StatsComponentRef[]) =>
  mapStatsResponse(STATS_FIXTURE_RESPONSES[scenario], requested);

const STANDARD_REQUEST = [
  destination('es-prod'),
  destination('es-dev'),
  processor('uppercase-message'),
];

describe('stats fixtures', () => {
  it.each(Object.entries(STATS_FIXTURE_RESPONSES))(
    '%s parses with the response schema',
    (_, response) => {
      expect(() => streamsUnitStatsResponseSchema.parse(response)).not.toThrow();
    }
  );
});

describe('mapStatsResponse', () => {
  it('maps data and keeps the window', () => {
    const result = map('data', STANDARD_REQUEST);

    expect(result.window).toEqual(STATS_FIXTURE_RESPONSES.data.meta.window);
    expect(result.destinations['es-prod']).toMatchObject({
      status: 'ready',
      stats: {
        eventsRate: 3700,
        eventsTotal: 3330000,
        failedRate: 0,
        latencyAverage: 0.012,
        series: { bucketMs: 300000 },
      },
    });
    expect(result.destinations['es-prod'].stats.series.points).toHaveLength(3);
    expect(result.destinations['es-prod'].error).toBeUndefined();
  });

  it('treats zero as data', () => {
    const result = map('data', STANDARD_REQUEST);

    expect(result.destinations['es-dev']).toMatchObject({
      status: 'ready',
      stats: { eventsRate: 0, eventsTotal: 0 },
    });
  });

  it('maps every instance of a processor with its pipeline and route', () => {
    const result = map('data', STANDARD_REQUEST);

    expect(result.processors['uppercase-message']).toEqual({
      status: 'ready',
      stats: {
        instances: [
          {
            pipelineId: 'main',
            routeIndex: null,
            eventsRate: 3700,
            failedRate: null,
            durationAverage: 0.008,
          },
          {
            pipelineId: 'main',
            routeIndex: 0,
            eventsRate: 1200,
            failedRate: null,
            durationAverage: 0.0004,
          },
          {
            pipelineId: 'main',
            routeIndex: 1,
            eventsRate: 2500,
            failedRate: null,
            durationAverage: null,
          },
        ],
      },
    });
  });

  it('classifies all-null destinations and a processor with no instances as no data', () => {
    const result = map('noData', STANDARD_REQUEST);

    expect(result.destinations['es-prod']).toMatchObject({
      status: 'noData',
      stats: { eventsRate: null, eventsTotal: null, failedRate: null, latencyAverage: null },
    });
    expect(result.destinations['es-dev'].status).toBe('noData');
    expect(result.processors['uppercase-message']).toEqual({
      status: 'noData',
      stats: { instances: [] },
    });
  });

  it('keeps data next to a component error', () => {
    const result = map('partial', STANDARD_REQUEST);

    expect(result.destinations['es-prod'].status).toBe('ready');
    expect(result.destinations['es-dev']).toMatchObject({
      status: 'error',
      error: STATS_FIXTURE_RESPONSES.partial.components.destinations['es-dev'].error,
    });
    expect(result.processors['uppercase-message'].status).toBe('ready');
  });

  it('sets the error on every component of a kind that failed, and keeps the other kind', () => {
    const result = map('kindError', STANDARD_REQUEST);

    expect(result.destinations['es-prod']).toMatchObject({
      status: 'error',
      error: { code: 'unavailable' },
    });
    expect(result.destinations['es-dev']).toMatchObject({
      status: 'error',
      error: { code: 'unavailable' },
    });
    expect(result.processors['uppercase-message'].status).toBe('ready');
  });

  it('shows a destination type that reports no metrics as no data, not as an error', () => {
    const result = map('unsupportedDestination', [destination('s3-archive')]);

    expect(result.destinations['s3-archive'].status).toBe('noData');
    expect(result.destinations['s3-archive'].error).toBeUndefined();
  });

  it('shows a destination that is not in the persisted unit as no data, not as an error', () => {
    const result = map('notFound', [destination('es-staged')]);

    expect(result.destinations['es-staged'].status).toBe('noData');
    expect(result.destinations['es-staged'].error).toBeUndefined();
  });

  it('shows a requested component that the response leaves out as no data', () => {
    const result = map('data', [destination('es-missing'), processor('missing-processor')]);

    expect(result.destinations['es-missing']).toMatchObject({
      status: 'noData',
      stats: { eventsRate: null, eventsTotal: null, failedRate: null, latencyAverage: null },
    });
    expect(result.processors['missing-processor']).toEqual({
      status: 'noData',
      stats: { instances: [] },
    });
  });

  it('maps only the requested components', () => {
    const result = map('data', [destination('es-prod')]);

    expect(Object.keys(result.destinations)).toEqual(['es-prod']);
    expect(result.processors).toEqual({});
  });

  it('drops a component kind it does not know', () => {
    // A kind added to the schema later must not break the nodes that exist today.
    const unknownKind = { kind: 'index', id: 'logs-1' } as unknown as StreamsUnit.StatsComponentRef;

    const result = map('data', [unknownKind, destination('es-prod')]);

    expect(Object.keys(result.destinations)).toEqual(['es-prod']);
    expect(result.processors).toEqual({});
  });
});
