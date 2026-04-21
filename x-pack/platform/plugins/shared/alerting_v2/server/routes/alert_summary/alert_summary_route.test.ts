/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { EsqlQueryResponse } from '@elastic/elasticsearch/lib/api/types';
import { httpServerMock, httpServiceMock } from '@kbn/core-http-server-mocks';
import type { AlertSummaryRequest } from '@kbn/alerting-v2-schemas';

import type { QueryServiceContract } from '../../lib/services/query_service/query_service';
import { createRouteDependencies } from '../test_utils';
import { AlertSummaryRoute } from './alert_summary_route';

function createQueryServiceMock(): jest.Mocked<QueryServiceContract> {
  return {
    executeQuery: jest.fn(),
    executeQueryRows: jest.fn(),
    executeQueryStream: jest.fn(),
  } as unknown as jest.Mocked<QueryServiceContract>;
}

function buildRequest(
  body: AlertSummaryRequest
): KibanaRequest<unknown, unknown, AlertSummaryRequest> {
  return httpServerMock.createKibanaRequest<unknown, unknown, AlertSummaryRequest>({ body });
}

describe('AlertSummaryRoute', () => {
  const http = httpServiceMock.createStartContract();
  const queryService = createQueryServiceMock();

  beforeEach(() => {
    jest.clearAllMocks();
    http.basePath.get.mockReturnValue('/s/space-1');
  });

  it('short-circuits with zeroed response when ruleIds is empty', async () => {
    const { ctx, response } = createRouteDependencies();
    const request = buildRequest({
      gte: '2025-01-01T00:00:00.000Z',
      lte: '2025-01-02T00:00:00.000Z',
      fixed_interval: '1 hour',
      ruleIds: [],
    });

    const route = new AlertSummaryRoute(ctx, request, http, queryService);
    await route.handle();

    expect(queryService.executeQuery).not.toHaveBeenCalled();
    expect(response.ok).toHaveBeenCalledWith({
      body: {
        activeEventCount: 0,
        recoveredEventCount: 0,
        activeSeries: [],
        recoveredSeries: [],
      },
    });
  });

  it('executes the query with the resolved space id and maps the response', async () => {
    const { ctx, response } = createRouteDependencies();
    const request = buildRequest({
      gte: '2025-01-01T00:00:00.000Z',
      lte: '2025-01-02T00:00:00.000Z',
      fixed_interval: '1 hour',
      ruleIds: ['rule-a', 'rule-b'],
    });

    const esqlResponse: EsqlQueryResponse = {
      columns: [
        { name: 'active_events', type: 'long' },
        { name: 'recovered_events', type: 'long' },
        { name: 'bucket', type: 'date' },
      ],
      values: [
        [2, 1, '2025-01-01T00:00:00.000Z'],
        [3, 4, '2025-01-01T01:00:00.000Z'],
      ],
    } as unknown as EsqlQueryResponse;
    queryService.executeQuery.mockResolvedValueOnce(esqlResponse);

    const route = new AlertSummaryRoute(ctx, request, http, queryService);
    await route.handle();

    expect(queryService.executeQuery).toHaveBeenCalledTimes(1);
    const [call] = queryService.executeQuery.mock.calls;
    expect(call[0].query).toContain('FROM ".rule-events"');
    expect(call[0].query).toContain('BUCKET(@timestamp, 1 hour)');
    expect(call[0].query).toContain('@timestamp >= ?gte::DATETIME');
    expect(call[0].query).toContain('@timestamp <= ?lte::DATETIME');
    expect(call[0].query).toContain('space_id == ?spaceId');
    expect(call[0].query).toMatch(/rule\.id IN \("rule-a", "rule-b"\)/);
    expect(call[0].params).toEqual(
      expect.arrayContaining([
        { spaceId: 'space-1' },
        { gte: '2025-01-01T00:00:00.000Z' },
        { lte: '2025-01-02T00:00:00.000Z' },
      ])
    );

    expect(response.ok).toHaveBeenCalledWith({
      body: {
        activeEventCount: 5,
        recoveredEventCount: 5,
        activeSeries: [
          {
            key: Date.parse('2025-01-01T00:00:00.000Z'),
            key_as_string: '2025-01-01T00:00:00.000Z',
            doc_count: 2,
          },
          {
            key: Date.parse('2025-01-01T01:00:00.000Z'),
            key_as_string: '2025-01-01T01:00:00.000Z',
            doc_count: 3,
          },
        ],
        recoveredSeries: [
          {
            key: Date.parse('2025-01-01T00:00:00.000Z'),
            key_as_string: '2025-01-01T00:00:00.000Z',
            doc_count: 1,
          },
          {
            key: Date.parse('2025-01-01T01:00:00.000Z'),
            key_as_string: '2025-01-01T01:00:00.000Z',
            doc_count: 4,
          },
        ],
      },
    });
  });

  it("defaults to the 'default' space when no space prefix is present", async () => {
    const { ctx } = createRouteDependencies();
    http.basePath.get.mockReturnValueOnce('');

    const request = buildRequest({
      gte: '2025-01-01T00:00:00.000Z',
      lte: '2025-01-02T00:00:00.000Z',
      fixed_interval: '1 hour',
      ruleIds: ['rule-a'],
    });

    queryService.executeQuery.mockResolvedValueOnce({
      columns: [],
      values: [],
    } as unknown as EsqlQueryResponse);

    const route = new AlertSummaryRoute(ctx, request, http, queryService);
    await route.handle();

    const [call] = queryService.executeQuery.mock.calls;
    expect(call[0].query).toContain('space_id == ?spaceId');
    expect(call[0].params).toEqual(expect.arrayContaining([{ spaceId: 'default' }]));
  });

  it('forwards query service errors through the base error handler', async () => {
    const { ctx, response } = createRouteDependencies();
    const request = buildRequest({
      gte: '2025-01-01T00:00:00.000Z',
      lte: '2025-01-02T00:00:00.000Z',
      fixed_interval: '1 hour',
      ruleIds: ['rule-a'],
    });

    queryService.executeQuery.mockRejectedValueOnce(Boom.badRequest('invalid query'));

    const route = new AlertSummaryRoute(ctx, request, http, queryService);
    await route.handle();

    expect(response.customError).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
  });
});
