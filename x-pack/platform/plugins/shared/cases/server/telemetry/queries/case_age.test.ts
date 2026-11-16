/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock, savedObjectsRepositoryMock } from '@kbn/core/server/mocks';
import { getCaseAgeTelemetryData } from './case_age';
import { TelemetrySavedObjectsClient } from '../telemetry_saved_objects_client';

const NOW = new Date('2026-11-16T12:00:00.000Z').getTime();
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

const emptyBuckets = { upTo1h: 0, upTo1d: 0, upTo7d: 0, upTo30d: 0, upTo90d: 0, over90d: 0 };
const emptyStats = { total: 0, p50: 0, p90: 0, buckets: emptyBuckets };
const emptyScope = { closed: emptyStats, open: emptyStats, inProgress: emptyStats };

const statsAggs = (
  docCount: number,
  percentiles: Array<{ key: number; value: number | null }>,
  buckets: Record<string, { doc_count: number }> = {}
) => ({ doc_count: docCount, buckets: { buckets }, percentiles: { values: percentiles } });

const emptyScopeAggs = () => ({
  closed: statsAggs(0, [
    { key: 50, value: null },
    { key: 90, value: null },
  ]),
  open: statsAggs(0, [
    { key: 10, value: null },
    { key: 50, value: null },
  ]),
  inProgress: statsAggs(0, [
    { key: 10, value: null },
    { key: 50, value: null },
  ]),
});

describe('getCaseAgeTelemetryData', () => {
  const logger = loggingSystemMock.createLogger();
  const savedObjectsRepository = savedObjectsRepositoryMock.create();
  const savedObjectsClient = new TelemetrySavedObjectsClient(savedObjectsRepository);

  const mockSearch = (aggregations: Record<string, unknown> | undefined) =>
    savedObjectsRepository.search.mockResolvedValue({
      took: 1,
      timed_out: false,
      _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
      hits: { hits: [] },
      aggregations,
    });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(NOW);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('reports durations, ages, and buckets per owner', async () => {
    mockSearch({
      all: emptyScopeAggs(),
      securitySolution: {
        closed: statsAggs(
          3,
          [
            { key: 50, value: 7200.4 },
            { key: 90, value: 90000.6 },
          ],
          { upTo1h: { doc_count: 1 }, upTo1d: { doc_count: 1 }, upTo7d: { doc_count: 1 } }
        ),
        open: statsAggs(
          2,
          [
            // created 10 days and 2 days ago
            { key: 10, value: NOW - 10 * DAY_MS },
            { key: 50, value: NOW - 2 * DAY_MS },
          ],
          { upTo7d: { doc_count: 1 }, upTo30d: { doc_count: 1 } }
        ),
        inProgress: statsAggs(
          1,
          [
            { key: 10, value: NOW - 100 * DAY_MS },
            { key: 50, value: NOW - 100 * DAY_MS },
          ],
          { over90d: { doc_count: 1 } }
        ),
      },
      observability: emptyScopeAggs(),
      cases: emptyScopeAggs(),
    });

    const res = await getCaseAgeTelemetryData({ savedObjectsClient, logger });

    expect(res.sec).toEqual({
      closed: {
        total: 3,
        p50: 7200,
        p90: 90001,
        buckets: { ...emptyBuckets, upTo1h: 1, upTo1d: 1, upTo7d: 1 },
      },
      open: {
        total: 2,
        p50: (2 * DAY_MS) / 1000,
        // the oldest 10% by creation date is the 90th percentile of age
        p90: (10 * DAY_MS) / 1000,
        buckets: { ...emptyBuckets, upTo7d: 1, upTo30d: 1 },
      },
      inProgress: {
        total: 1,
        p50: (100 * DAY_MS) / 1000,
        p90: (100 * DAY_MS) / 1000,
        buckets: { ...emptyBuckets, over90d: 1 },
      },
    });
    expect(res.all).toEqual(emptyScope);
    expect(res.obs).toEqual(emptyScope);
    expect(res.main).toEqual(emptyScope);
  });

  it('clamps the age of cases created in the future to 0', async () => {
    mockSearch({
      all: {
        ...emptyScopeAggs(),
        open: statsAggs(1, [
          { key: 10, value: NOW + HOUR_MS },
          { key: 50, value: NOW + HOUR_MS },
        ]),
      },
    });

    const res = await getCaseAgeTelemetryData({ savedObjectsClient, logger });

    expect(res.all.open).toEqual({ ...emptyStats, total: 1 });
  });

  it('returns zeros when there are no aggregations', async () => {
    mockSearch(undefined);

    const res = await getCaseAgeTelemetryData({ savedObjectsClient, logger });

    expect(res).toEqual({ all: emptyScope, sec: emptyScope, obs: emptyScope, main: emptyScope });
  });

  it('builds one size 0 search across all spaces with the expected filters', async () => {
    mockSearch(undefined);

    await getCaseAgeTelemetryData({ savedObjectsClient, logger });

    expect(savedObjectsRepository.search).toHaveBeenCalledTimes(1);
    const [request] = savedObjectsRepository.search.mock.calls[0];
    expect(request).toEqual(
      expect.objectContaining({ type: ['cases'], namespaces: ['*'], size: 0 })
    );

    const aggs = request.aggs as Record<string, { filter: unknown; aggs: Record<string, unknown> }>;
    expect(Object.keys(aggs).sort()).toEqual(['all', 'cases', 'observability', 'securitySolution']);
    expect(aggs.securitySolution.filter).toEqual({
      term: { 'cases.owner': 'securitySolution' },
    });
    expect(aggs.all.filter).toEqual({ match_all: {} });
    // Every scope runs the same sub-aggregations.
    expect(aggs.securitySolution.aggs).toEqual(aggs.all.aggs);
    expect(aggs.observability.aggs).toEqual(aggs.all.aggs);
    expect(aggs.cases.aggs).toEqual(aggs.all.aggs);

    const activeAggs = (status: number) => ({
      filter: { term: { 'cases.status': status } },
      aggs: {
        buckets: {
          date_range: {
            field: 'cases.created_at',
            keyed: true,
            ranges: [
              { key: 'upTo1h', from: 'now-1h' },
              { key: 'upTo1d', from: 'now-1d', to: 'now-1h' },
              { key: 'upTo7d', from: 'now-7d', to: 'now-1d' },
              { key: 'upTo30d', from: 'now-30d', to: 'now-7d' },
              { key: 'upTo90d', from: 'now-90d', to: 'now-30d' },
              { key: 'over90d', to: 'now-90d' },
            ],
          },
        },
        percentiles: {
          percentiles: { field: 'cases.created_at', percents: [10, 50], keyed: false },
        },
      },
    });

    expect(aggs.all.aggs).toEqual({
      closed: {
        filter: {
          bool: {
            filter: [
              { term: { 'cases.status': 20 } },
              { range: { 'cases.closed_at': { gte: 'now-30d' } } },
              { exists: { field: 'cases.duration' } },
            ],
          },
        },
        aggs: {
          buckets: {
            range: {
              field: 'cases.duration',
              keyed: true,
              ranges: [
                { key: 'upTo1h', to: 3600 },
                { key: 'upTo1d', from: 3600, to: 86400 },
                { key: 'upTo7d', from: 86400, to: 604800 },
                { key: 'upTo30d', from: 604800, to: 2592000 },
                { key: 'upTo90d', from: 2592000, to: 7776000 },
                { key: 'over90d', from: 7776000 },
              ],
            },
          },
          percentiles: {
            percentiles: { field: 'cases.duration', percents: [50, 90], keyed: false },
          },
        },
      },
      open: activeAggs(0),
      inProgress: activeAggs(10),
    });
  });

  it('throws when the search fails', async () => {
    savedObjectsRepository.search.mockRejectedValue(new Error('boom'));

    await expect(getCaseAgeTelemetryData({ savedObjectsClient, logger })).rejects.toThrow('boom');
  });
});
