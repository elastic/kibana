/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { CustomKpiMetricConfiguration } from '../../../../common/types/domain';
import { KPI_METRIC_VALUE_AGG } from './query_builder';
import { runKpiMetrics } from './run';

const context = { spaceId: 'space-a', owner: 'securitySolution' };
const rangeContext = { ...context, from: 'now-30d', to: 'now' };

const createMetric = (
  overrides: Partial<CustomKpiMetricConfiguration> = {}
): CustomKpiMetricConfiguration => ({
  id: 'metric-1',
  kind: 'custom',
  label: 'Closed cases',
  index: 'cases',
  query: 'case.status: closed',
  display: 'value',
  ...overrides,
});

const createResponse = (
  total: number,
  aggregations?: Record<string, estypes.AggregationsAggregate>
): estypes.MsearchMultiSearchItem => ({
  took: 1,
  timed_out: false,
  status: 200,
  _shards: { total: 1, successful: 1, failed: 0 },
  hits: { total: { value: total, relation: 'eq' }, hits: [] },
  ...(aggregations != null && { aggregations }),
});

describe('runKpiMetrics', () => {
  it('runs every valid metric in one msearch and keeps the metric order', async () => {
    const msearch = jest
      .fn()
      .mockResolvedValue([
        createResponse(12),
        createResponse(5, { [KPI_METRIC_VALUE_AGG]: { value: 3600 } }),
      ]);

    const results = await runKpiMetrics({
      metrics: [
        createMetric({ id: 'count' }),
        createMetric({ id: 'avg', aggregation: { type: 'avg', field: 'case.time_to_resolve' } }),
      ],
      context,
      reader: { msearch },
    });

    expect(msearch).toHaveBeenCalledTimes(1);
    expect(msearch.mock.calls[0][0]).toHaveLength(2);
    expect(results).toEqual([
      { id: 'count', type: 'value', format: 'number', value: 12 },
      { id: 'avg', type: 'value', format: 'duration', value: 3600 },
    ]);
  });

  it('gives an error result for an unbalanced KQL query and never sends it', async () => {
    const msearch = jest.fn().mockResolvedValue([createResponse(7)]);

    const results = await runKpiMetrics({
      metrics: [
        createMetric({ id: 'broken', query: 'status: closed or (space_id: *' }),
        createMetric({ id: 'valid' }),
      ],
      context,
      reader: { msearch },
    });

    const sentRequests = msearch.mock.calls[0][0];
    expect(sentRequests).toHaveLength(1);
    expect(JSON.stringify(sentRequests)).not.toContain('space_id: *');
    expect(results[0]).toEqual(expect.objectContaining({ id: 'broken', type: 'error' }));
    expect(results[1]).toEqual({ id: 'valid', type: 'value', format: 'number', value: 7 });
  });

  it('does not call msearch when no metric is valid', async () => {
    const msearch = jest.fn();

    const results = await runKpiMetrics({
      metrics: [createMetric({ query: 'status: (' })],
      context,
      reader: { msearch },
    });

    expect(msearch).not.toHaveBeenCalled();
    expect(results).toEqual([expect.objectContaining({ type: 'error' })]);
  });

  it('gives an error result for the failed item only', async () => {
    const msearch = jest
      .fn()
      .mockResolvedValue([
        { status: 400, error: { type: 'search_phase_execution_exception', reason: 'bad field' } },
        createResponse(2),
      ]);

    const results = await runKpiMetrics({
      metrics: [createMetric({ id: 'failed' }), createMetric({ id: 'valid' })],
      context,
      reader: { msearch },
    });

    expect(results).toEqual([
      { id: 'failed', type: 'error', message: 'bad field' },
      { id: 'valid', type: 'value', format: 'number', value: 2 },
    ]);
  });

  it('gives an error result for a timed-out or a shard-failed item', async () => {
    const msearch = jest
      .fn()
      .mockResolvedValue([
        { ...createResponse(4), timed_out: true },
        { ...createResponse(3), _shards: { total: 2, successful: 1, failed: 1 } },
        createResponse(2),
      ]);

    const results = await runKpiMetrics({
      metrics: [
        createMetric({ id: 'timed-out' }),
        createMetric({ id: 'shard-failed' }),
        createMetric({ id: 'valid' }),
      ],
      context,
      reader: { msearch },
    });

    expect(results).toEqual([
      { id: 'timed-out', type: 'error', message: 'The metric search returned incomplete results.' },
      {
        id: 'shard-failed',
        type: 'error',
        message: 'The metric search returned incomplete results.',
      },
      { id: 'valid', type: 'value', format: 'number', value: 2 },
    ]);
  });

  it('gives an error result for every metric when msearch throws', async () => {
    const msearch = jest.fn().mockRejectedValue(new Error('connection error'));

    const results = await runKpiMetrics({
      metrics: [createMetric({ id: 'a' }), createMetric({ id: 'b' })],
      context,
      reader: { msearch },
    });

    expect(results).toEqual([
      { id: 'a', type: 'error', message: 'The metric search failed.' },
      { id: 'b', type: 'error', message: 'The metric search failed.' },
    ]);
  });

  describe('previous period', () => {
    it('runs each metric for the previous period in the same msearch', async () => {
      const msearch = jest
        .fn()
        .mockResolvedValue([
          createResponse(12),
          createResponse(5, { [KPI_METRIC_VALUE_AGG]: { value: 3600 } }),
          createResponse(10),
          createResponse(4, { [KPI_METRIC_VALUE_AGG]: { value: 7200 } }),
        ]);

      const results = await runKpiMetrics({
        metrics: [
          createMetric({ id: 'count' }),
          createMetric({ id: 'avg', aggregation: { type: 'avg', field: 'case.time_to_resolve' } }),
        ],
        context: rangeContext,
        reader: { msearch },
      });

      expect(msearch).toHaveBeenCalledTimes(1);
      expect(msearch.mock.calls[0][0]).toHaveLength(4);
      expect(results).toEqual([
        { id: 'count', type: 'value', format: 'number', value: 12, previousValue: 10 },
        { id: 'avg', type: 'value', format: 'duration', value: 3600, previousValue: 7200 },
      ]);
    });

    it('keeps the forced filters and uses an absolute range in the previous search', async () => {
      const msearch = jest.fn().mockResolvedValue([createResponse(1), createResponse(2)]);

      await runKpiMetrics({
        metrics: [createMetric({ query: 'space_id: * or owner: *' })],
        context: rangeContext,
        reader: { msearch },
      });

      const [, previousRequest] = msearch.mock.calls[0][0];
      const filter = previousRequest.body.query.bool.filter;

      expect(filter).toEqual(
        expect.arrayContaining([
          { term: { space_id: 'space-a' } },
          { term: { owner: 'securitySolution' } },
        ])
      );
      expect(filter[2].range['case.created_at'].gte).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(filter[2].range['case.created_at'].lte).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('puts the range of the previous search on case.closed_at for the closed date', async () => {
      const msearch = jest.fn().mockResolvedValue([createResponse(9), createResponse(6)]);

      const results = await runKpiMetrics({
        metrics: [createMetric({ id: 'closed', dateField: 'closed_at' })],
        context: rangeContext,
        reader: { msearch },
      });

      const [request, previousRequest] = msearch.mock.calls[0][0];
      const previousFilter = previousRequest.body.query.bool.filter;

      expect(request.body.query.bool.filter[2]).toEqual({
        range: { 'case.closed_at': { gte: 'now-30d', lte: 'now' } },
      });
      expect(previousFilter[2].range).not.toHaveProperty('case.created_at');
      expect(previousFilter[2].range['case.closed_at'].gte).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(previousFilter[2].range['case.closed_at'].lte).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(results).toEqual([
        { id: 'closed', type: 'value', format: 'number', value: 9, previousValue: 6 },
      ]);
    });

    it('gives a null previous value when the previous search fails', async () => {
      const msearch = jest
        .fn()
        .mockResolvedValue([
          createResponse(3),
          { status: 400, error: { type: 'search_phase_execution_exception', reason: 'bad' } },
        ]);

      const results = await runKpiMetrics({
        metrics: [createMetric({ id: 'a' })],
        context: rangeContext,
        reader: { msearch },
      });

      expect(results).toEqual([
        { id: 'a', type: 'value', format: 'number', value: 3, previousValue: null },
      ]);
    });

    it('gives a null previous value when the previous search is timed out or shard-failed', async () => {
      const msearch = jest
        .fn()
        .mockResolvedValue([
          createResponse(3),
          createResponse(5),
          { ...createResponse(2), timed_out: true },
          { ...createResponse(4), _shards: { total: 2, successful: 1, failed: 1 } },
        ]);

      const results = await runKpiMetrics({
        metrics: [createMetric({ id: 'timed-out' }), createMetric({ id: 'shard-failed' })],
        context: rangeContext,
        reader: { msearch },
      });

      expect(results).toEqual([
        { id: 'timed-out', type: 'value', format: 'number', value: 3, previousValue: null },
        { id: 'shard-failed', type: 'value', format: 'number', value: 5, previousValue: null },
      ]);
    });

    it('does not run the previous period when the range has no start', async () => {
      const msearch = jest.fn().mockResolvedValue([createResponse(3)]);

      const results = await runKpiMetrics({
        metrics: [createMetric({ id: 'a' })],
        context: { ...context, to: 'now' },
        reader: { msearch },
      });

      expect(msearch.mock.calls[0][0]).toHaveLength(1);
      expect(results).toEqual([{ id: 'a', type: 'value', format: 'number', value: 3 }]);
    });
  });
});
