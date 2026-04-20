/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import type { RulesClient } from '../../lib/rules_client';
import { createRouteDependencies } from '../test_utils';
import { GetRulesRoute } from './get_rules_route';

describe('GetRulesRoute', () => {
  const rulesClient = {
    findRules: jest.fn(),
  } as unknown as jest.Mocked<Pick<RulesClient, 'findRules'>>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('forwards filter, search, and sort params to the rules client', async () => {
    const { ctx, response } = createRouteDependencies();
    const request = httpServerMock.createKibanaRequest({
      query: {
        page: 2,
        perPage: 50,
        filter: 'enabled: true',
        search: 'prod',
        sortField: 'enabled',
        sortOrder: 'desc',
      },
    });

    rulesClient.findRules.mockResolvedValueOnce({
      items: [],
      total: 0,
      page: 2,
      perPage: 50,
    });

    const route = new GetRulesRoute(ctx, request, rulesClient as unknown as RulesClient);
    await route.handle();

    expect(rulesClient.findRules).toHaveBeenCalledWith({
      page: 2,
      perPage: 50,
      filter: 'enabled: true',
      search: 'prod',
      sortField: 'enabled',
      sortOrder: 'desc',
    });
    expect(response.ok).toHaveBeenCalledWith({
      body: {
        items: [],
        total: 0,
        page: 2,
        perPage: 50,
      },
    });
  });

  it('returns a custom error response when the rules client throws', async () => {
    const { ctx, response } = createRouteDependencies();
    const request = httpServerMock.createKibanaRequest({
      query: {
        sortField: 'kind',
        sortOrder: 'asc',
      },
    });

    rulesClient.findRules.mockRejectedValueOnce(Boom.badRequest('invalid sort'));

    const route = new GetRulesRoute(ctx, request, rulesClient as unknown as RulesClient);
    await route.handle();

    expect(response.customError).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
      })
    );
  });
});
