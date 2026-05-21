/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import type { RuleDoctorInsightsClient } from '../../lib/rule_doctor_insights_client/rule_doctor_insights_client';
import { createRouteDependencies } from '../test_utils';
import { ListInsightsRoute } from './list_insights_route';
import type { SpaceContext } from './space_context';

describe('ListInsightsRoute', () => {
  const insightsClient = {
    listInsights: jest.fn(),
  } as unknown as jest.Mocked<Pick<RuleDoctorInsightsClient, 'listInsights'>>;

  const spaceContext: SpaceContext = { spaceId: 'default' };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('forwards query params to the insights client with page/perPage conversion', async () => {
    const { ctx, response } = createRouteDependencies();
    const request = httpServerMock.createKibanaRequest({
      query: { page: 2, perPage: 10, status: 'open' },
    });

    insightsClient.listInsights.mockResolvedValueOnce({ items: [], total: 0 });

    const route = new ListInsightsRoute(
      ctx,
      request,
      insightsClient as unknown as RuleDoctorInsightsClient,
      spaceContext
    );
    await route.handle();

    expect(insightsClient.listInsights).toHaveBeenCalledWith({
      spaceId: 'default',
      from: 10,
      size: 10,
      status: 'open',
      type: undefined,
      executionId: undefined,
      ruleIds: undefined,
    });
    expect(response.ok).toHaveBeenCalledWith({
      body: { items: [], total: 0, page: 2, perPage: 10 },
    });
  });

  it('forwards rule_ids array to the insights client', async () => {
    const { ctx } = createRouteDependencies();
    const request = httpServerMock.createKibanaRequest({
      query: { page: 1, perPage: 20, rule_ids: ['abc', 'def', 'ghi'] },
    });

    insightsClient.listInsights.mockResolvedValueOnce({ items: [], total: 0 });

    const route = new ListInsightsRoute(
      ctx,
      request,
      insightsClient as unknown as RuleDoctorInsightsClient,
      spaceContext
    );
    await route.handle();

    expect(insightsClient.listInsights).toHaveBeenCalledWith(
      expect.objectContaining({
        ruleIds: ['abc', 'def', 'ghi'],
      })
    );
  });

  it('returns a custom error when the client throws', async () => {
    const { ctx, response } = createRouteDependencies();
    const request = httpServerMock.createKibanaRequest({
      query: { page: 1, perPage: 20 },
    });

    insightsClient.listInsights.mockRejectedValueOnce(Boom.internal('es failure'));

    const route = new ListInsightsRoute(
      ctx,
      request,
      insightsClient as unknown as RuleDoctorInsightsClient,
      spaceContext
    );
    await route.handle();

    expect(response.customError).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 500 }));
  });
});
