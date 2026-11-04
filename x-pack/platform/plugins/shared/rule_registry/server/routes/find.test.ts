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

  describe('range aggregation validation', () => {
    test('accepts range aggregations, including under a terms aggregation', async () => {
      const started = {
        range: {
          field: 'kibana.alert.start',
          ranges: [
            { to: '2024-01-01T01:00:00.000Z' },
            { from: '2024-01-01T01:00:00.000Z', to: '2024-01-01T02:00:00.000Z' },
          ],
        },
      };
      const ended = {
        range: {
          field: 'kibana.alert.end',
          missing: 1704070800000,
          ranges: [{ to: 1704067200001 }, { from: 1704067200001, to: 1704070800001 }],
        },
      };
      const aggs = {
        started,
        breakdown: {
          terms: { field: 'kibana.alert.status', size: 50 },
          aggs: { started, ended },
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
            started: expect.objectContaining({ range: started.range }),
            breakdown: expect.objectContaining({
              terms: expect.objectContaining(aggs.breakdown.terms),
              aggs: {
                started: expect.objectContaining({ range: started.range }),
                ended: expect.objectContaining({ range: ended.range }),
              },
            }),
          },
        })
      );
    });

    test('rejects unknown keys inside a range aggregation', async () => {
      await expect(
        server.inject(
          {
            ...getFindRequest(),
            body: { aggs: { bad: { range: { field: 'kibana.alert.start', script: 'x' } } } },
          },
          context
        )
      ).rejects.toThrow(/script/);
    });
  });
});
