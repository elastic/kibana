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
import { UpdateInsightStatusRoute } from './update_insight_status_route';
import type { SpaceContext } from './space_context';

describe('UpdateInsightStatusRoute', () => {
  const insightsClient = {
    updateInsightStatus: jest.fn(),
  } as unknown as jest.Mocked<Pick<RuleDoctorInsightsClient, 'updateInsightStatus'>>;

  const spaceContext: SpaceContext = { spaceId: 'my-space' };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('delegates to updateInsightStatus and returns noContent', async () => {
    const { ctx, response } = createRouteDependencies();
    const request = httpServerMock.createKibanaRequest({
      params: { insight_id: 'insight-1' },
      body: { status: 'dismissed' },
    });

    insightsClient.updateInsightStatus.mockResolvedValueOnce(undefined);

    const route = new UpdateInsightStatusRoute(
      ctx,
      request,
      insightsClient as unknown as RuleDoctorInsightsClient,
      spaceContext
    );
    await route.handle();

    expect(insightsClient.updateInsightStatus).toHaveBeenCalledWith(
      'insight-1',
      'dismissed',
      'my-space'
    );
    expect(response.noContent).toHaveBeenCalled();
  });

  it('returns 404 when insight is not found', async () => {
    const { ctx, response } = createRouteDependencies();
    const request = httpServerMock.createKibanaRequest({
      params: { insight_id: 'nonexistent' },
      body: { status: 'applied' },
    });

    insightsClient.updateInsightStatus.mockRejectedValueOnce(
      Boom.notFound('Insight nonexistent not found')
    );

    const route = new UpdateInsightStatusRoute(
      ctx,
      request,
      insightsClient as unknown as RuleDoctorInsightsClient,
      spaceContext
    );
    await route.handle();

    expect(response.customError).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404 }));
  });
});
