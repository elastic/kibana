/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import type { RuleDoctorInsightsClient } from '../../lib/rule_doctor_insights_client/rule_doctor_insights_client';
import type { RuleDoctorInsightDoc } from '../../resources/indices/rule_doctor_insights';
import { createRouteDependencies } from '../test_utils';
import { GetInsightRoute } from './get_insight_route';
import type { SpaceContext } from './space_context';

describe('GetInsightRoute', () => {
  const insightsClient = {
    getInsight: jest.fn(),
  } as unknown as jest.Mocked<Pick<RuleDoctorInsightsClient, 'getInsight'>>;

  const spaceContext: SpaceContext = { spaceId: 'default' };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the insight doc on success', async () => {
    const { ctx, response } = createRouteDependencies();
    const request = httpServerMock.createKibanaRequest({
      params: { insight_id: 'insight-1' },
    });

    const insight = {
      insight_id: 'insight-1',
      status: 'open',
    } as unknown as RuleDoctorInsightDoc;
    insightsClient.getInsight.mockResolvedValueOnce(insight);

    const route = new GetInsightRoute(
      ctx,
      request,
      insightsClient as unknown as RuleDoctorInsightsClient,
      spaceContext
    );
    await route.handle();

    expect(insightsClient.getInsight).toHaveBeenCalledWith('insight-1', 'default');
    expect(response.ok).toHaveBeenCalledWith({ body: insight });
  });

  it('returns 404 when insight is not found', async () => {
    const { ctx, response } = createRouteDependencies();
    const request = httpServerMock.createKibanaRequest({
      params: { insight_id: 'nonexistent' },
    });

    insightsClient.getInsight.mockRejectedValueOnce(Boom.notFound('Insight nonexistent not found'));

    const route = new GetInsightRoute(
      ctx,
      request,
      insightsClient as unknown as RuleDoctorInsightsClient,
      spaceContext
    );
    await route.handle();

    expect(response.customError).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404 }));
  });
});
