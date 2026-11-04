/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { findAlertsByQueryRoute } from './find';
import { requestContextMock } from './__mocks__/request_context';
import { getFindRequest } from './__mocks__/request_responses';
import { serverMock } from './__mocks__/server';

describe('findAlertsByQueryRoute', () => {
  let server: ReturnType<typeof serverMock.create>;
  let { clients, context } = requestContextMock.createTools();

  beforeEach(async () => {
    server = serverMock.create();
    ({ clients, context } = requestContextMock.createTools());

    // @ts-expect-error: More properties are not needed
    clients.rac.find.mockResolvedValue({ hits: { hits: [] } });

    findAlertsByQueryRoute(server.router);
  });

  test('returns 200 when querying for alerts', async () => {
    const response = await server.inject(getFindRequest(), context);

    expect(response.status).toEqual(200);
    expect(response.body).toEqual({ hits: { hits: [] } });
  });

  test('calls the alerts client correctly', async () => {
    const response = await server.inject(getFindRequest(), context);

    expect(response.status).toEqual(200);
    expect(clients.rac.find).toHaveBeenCalledWith({
      _source: undefined,
      aggs: undefined,
      consumers: ['siem'],
      index: undefined,
      query: undefined,
      ruleTypeIds: ['siem.esqlRule'],
      search_after: undefined,
      size: undefined,
      sort: undefined,
      track_total_hits: undefined,
    });
  });

  test('accepts not defined ryleTypeIds and consumers', async () => {
    const response = await server.inject({ ...getFindRequest(), body: {} }, context);
    expect(response.status).toEqual(200);
  });

  describe('aggregation filter validation', () => {
    test('accepts query DSL clauses inside a filter aggregation', async () => {
      const aggs = {
        bucket_0: {
          filter: {
            bool: {
              filter: [
                { range: { 'kibana.alert.start': { lt: '2024-01-01T01:00:00.000Z' } } },
                { bool: { must_not: { exists: { field: 'kibana.alert.end' } } } },
              ],
            },
          },
          aggs: { breakdown: { terms: { field: 'kibana.alert.status', size: 50 } } },
        },
      };

      const response = await server.inject(
        { ...getFindRequest(), body: { rule_type_ids: ['.es-query'], size: 0, aggs } },
        context
      );

      expect(response.status).toEqual(200);
      expect(clients.rac.find).toHaveBeenCalledWith(
        expect.objectContaining({
          aggs: {
            bucket_0: expect.objectContaining({
              filter: expect.objectContaining({ bool: aggs.bucket_0.filter.bool }),
              aggs: aggs.bucket_0.aggs,
            }),
          },
        })
      );
    });

    test('still accepts a term filter aggregation', async () => {
      const response = await server.inject(
        {
          ...getFindRequest(),
          body: { aggs: { active: { filter: { term: { 'kibana.alert.status': 'active' } } } } },
        },
        context
      );

      expect(response.status).toEqual(200);
    });

    test('rejects unknown keys inside a filter aggregation', async () => {
      await expect(
        server.inject(
          { ...getFindRequest(), body: { aggs: { bad: { filter: { not_a_query: {} } } } } },
          context
        )
      ).rejects.toThrow(/not_a_query/);
    });

    test('rejects script queries inside a filter aggregation', async () => {
      await expect(
        server.inject(
          { ...getFindRequest(), body: { aggs: { bad: { filter: { script: { source: '1' } } } } } },
          context
        )
      ).rejects.toThrow(/script/);
    });
  });
});
