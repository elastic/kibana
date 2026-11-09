/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import type { InvestigationSeed } from '@kbn/investigation-seed';
import type { LogsDataAccessPluginStart } from '@kbn/logs-data-access-plugin/server';
import { type ChangePoint, getLogChangePoint } from '@kbn/signals-server';
import type { SignalAnalyzerDeps } from '@kbn/signal-investigation-contract';
import {
  buildLogEntityKql,
  createLogChangePointsAnalyzer,
  logChangePointsApplicability,
  mapLogChangePointBuckets,
} from './log_change_points_analyzer';

jest.mock('@kbn/signals-server', () => ({
  ...jest.requireActual('@kbn/signals-server'),
  getLogChangePoint: jest.fn(),
}));

const getLogChangePointMock = getLogChangePoint as jest.MockedFunction<typeof getLogChangePoint>;

const seed = (overrides: Partial<InvestigationSeed> = {}): InvestigationSeed => ({
  origin: { app: 'alerts', alertId: 'alert-1', ruleTypeId: 'apm.threshold' },
  timeRange: { from: '2026-11-02T11:00:00.000Z', to: '2026-11-02T12:00:00.000Z' },
  filters: [],
  entities: { 'service.name': 'checkout', 'service.environment': 'production' },
  ...overrides,
});

const bucket = (type: ChangePoint['changes']['type'], pValue?: number): ChangePoint => ({
  key: 'Connection refused to payments',
  pattern: 'Connection refused.*',
  summary: type,
  changes: {
    type,
    p_value: pValue,
    time: '2026-11-02T11:15:00.000Z',
  },
});

describe('logChangePointsApplicability', () => {
  it('requires a service or host name and rejects ES|QL', () => {
    expect(logChangePointsApplicability(seed({ entities: {} })).applicable).toBe(false);
    expect(
      logChangePointsApplicability(seed({ entities: { 'host.name': 'web-1' } })).applicable
    ).toBe(true);
    expect(logChangePointsApplicability(seed({ query: { esql: 'FROM logs-*' } })).applicable).toBe(
      false
    );
  });
});

describe('buildLogEntityKql', () => {
  it('filters to the service first and falls back to the host when there is no service', () => {
    expect(buildLogEntityKql(seed()).kql).toBe(
      'service.name : "checkout" and service.environment : "production"'
    );
    expect(buildLogEntityKql(seed({ entities: { 'host.name': 'web-1' } })).kql).toBe(
      'host.name : "web-1"'
    );
  });
});

describe('mapLogChangePointBuckets', () => {
  it('maps stationary buckets to no_change and indeterminable-only buckets to indeterminable', () => {
    expect(mapLogChangePointBuckets({ items: [bucket('stationary')], seed: seed() }).status).toBe(
      'no_change'
    );
    expect(
      mapLogChangePointBuckets({ items: [bucket('indeterminable')], seed: seed() }).status
    ).toBe('indeterminable');
  });

  it('reports no buckets as indeterminable instead of no change', () => {
    expect(mapLogChangePointBuckets({ items: [], seed: seed() })).toEqual({
      leads: [],
      entities: {},
      status: 'indeterminable',
      message: 'Not enough data to decide',
    });
  });

  it('does not turn non-stationary patterns into leads', () => {
    const result = mapLogChangePointBuckets({
      items: [bucket('non_stationary', 0.001), bucket('indeterminable')],
      seed: seed(),
    });

    expect(result.status).toBe('no_change');
    expect(result.leads).toEqual([]);
  });

  it('turns a significant bucket into a ranked lead with Discover locator params', () => {
    const result = mapLogChangePointBuckets({
      items: [bucket('spike', 0.002)],
      seed: seed({ dataViewId: 'logs-view' }),
    });

    expect(result.status).toBe('found');
    expect(result.leads).toHaveLength(1);
    expect(result.leads[0].ranking).toEqual({
      signal: 'strong',
      timing: 'during',
      relationship: 'service',
    });
    expect(result.leads[0].locatorParams).toEqual({
      kql: 'service.name : "checkout" and service.environment : "production"',
      rangeFrom: '2026-11-02T11:00:00.000Z',
      rangeTo: '2026-11-02T12:00:00.000Z',
      dataViewId: 'logs-view',
    });
  });

  it('keeps 120 characters of a pattern and truncates the 121st', () => {
    const exact = 'e'.repeat(120);
    const longer = 'l'.repeat(121);
    const exactResult = mapLogChangePointBuckets({
      items: [{ ...bucket('spike', 0.002), key: `  ${exact}  ` }],
      seed: seed(),
    });
    const truncatedResult = mapLogChangePointBuckets({
      items: [{ ...bucket('spike', 0.002), key: longer }],
      seed: seed(),
    });

    expect(exactResult.leads[0].summary).toBe(`Log pattern "${exact}" spike on checkout`);
    expect(truncatedResult.leads[0].summary).toBe(
      `Log pattern "${'l'.repeat(120)}…" spike on checkout`
    );
  });

  it('gives patterns that share a truncated prefix different lead ids', () => {
    const prefix = 'p'.repeat(120);
    const result = mapLogChangePointBuckets({
      items: [
        { ...bucket('spike', 0.002), key: `${prefix}aaa` },
        { ...bucket('spike', 0.002), key: `${prefix}bbb` },
      ],
      seed: seed(),
    });

    expect(result.leads).toHaveLength(2);
    expect(result.leads[0].id).not.toBe(result.leads[1].id);
    expect(result.leads[0].id).not.toContain(prefix);
    expect(result.leads[0].summary).toBe(result.leads[1].summary);
  });
});

describe('createLogChangePointsAnalyzer', () => {
  const esClient = { asCurrentUser: {} };
  const deps = {
    request: {},
    context: {
      core: Promise.resolve({
        savedObjects: { client: {} },
        elasticsearch: { client: esClient },
      }),
    },
  } as unknown as SignalAnalyzerDeps;

  const getFlattenedLogSources = jest.fn(async () => 'logs-*,custom-logs-*');
  const getResolvedLogView = jest.fn();
  const dataViewGet = jest.fn();
  const analyzer = createLogChangePointsAnalyzer({
    getLogsDataAccess: async () =>
      ({
        services: {
          logSourcesServiceFactory: {
            getLogSourcesService: async () => ({ getFlattenedLogSources }),
          },
        },
      } as unknown as LogsDataAccessPluginStart),
    getDataViews: async () =>
      ({ dataViewsServiceFactory: async () => ({ get: dataViewGet }) } as never),
    getLogViews: async () => ({ getScopedClient: () => ({ getResolvedLogView }) } as never),
  });

  beforeEach(() => {
    getLogChangePointMock.mockReset();
    getLogChangePointMock.mockResolvedValue([]);
    getFlattenedLogSources.mockClear();
    dataViewGet.mockReset();
  });

  it('queries the configured log sources and forwards the abort signal', async () => {
    const controller = new AbortController();
    await analyzer.run(seed(), deps, controller.signal);

    expect(getFlattenedLogSources).toHaveBeenCalled();
    expect(getLogChangePointMock).toHaveBeenCalledWith(
      expect.objectContaining({
        index: 'logs-*,custom-logs-*',
        timeField: '@timestamp',
        kqlFilter: 'service.name : "checkout" and service.environment : "production"',
        messageField: 'message',
        esClient,
        signal: controller.signal,
      })
    );
  });

  it('prefers the seed index pattern over the configured log sources', async () => {
    await analyzer.run(seed({ indexPattern: 'my-logs-*' }), deps, new AbortController().signal);

    expect(getLogChangePointMock).toHaveBeenCalledWith(
      expect.objectContaining({ index: 'my-logs-*', timeField: '@timestamp' })
    );
  });

  it('uses the resolved log view index and timestamp field', async () => {
    getResolvedLogView.mockResolvedValue({
      indices: 'logs-custom-*',
      timestampField: 'event.ingested',
    });

    await analyzer.run(
      seed({
        indexPattern: 'logs-*',
        origin: {
          app: 'alerts',
          alertId: 'alert-1',
          ruleTypeId: 'logs.alert.document.count',
          logViewId: 'log-view-1',
        },
      }),
      deps,
      new AbortController().signal
    );

    expect(getLogChangePointMock).toHaveBeenCalledWith(
      expect.objectContaining({ index: 'logs-custom-*', timeField: 'event.ingested' })
    );
  });

  it('reports a traces-only index as not applicable', async () => {
    const result = await analyzer.run(
      seed({ indexPattern: 'traces-apm*' }),
      deps,
      new AbortController().signal
    );

    expect(result.status).toBe('not_applicable');
    expect(getLogChangePointMock).not.toHaveBeenCalled();
  });

  it('reports a missing data view as not set up', async () => {
    dataViewGet.mockRejectedValue(
      SavedObjectsErrorHelpers.createGenericNotFoundError('index-pattern', 'missing')
    );

    const result = await analyzer.run(
      seed({ dataViewId: 'missing' }),
      deps,
      new AbortController().signal
    );

    expect(result.status).toBe('not_set_up');
    expect(getLogChangePointMock).not.toHaveBeenCalled();
  });
});
