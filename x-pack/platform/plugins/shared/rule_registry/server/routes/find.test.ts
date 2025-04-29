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
});
