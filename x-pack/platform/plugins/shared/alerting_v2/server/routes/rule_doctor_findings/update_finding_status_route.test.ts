/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import type { RuleDoctorFindingsClient } from '../../lib/rule_doctor_findings_client/rule_doctor_findings_client';
import { createRouteDependencies } from '../test_utils';
import { UpdateFindingStatusRoute } from './update_finding_status_route';
import type { SpaceContext } from './space_context';

describe('UpdateFindingStatusRoute', () => {
  const findingsClient = {
    updateFindingStatus: jest.fn(),
  } as unknown as jest.Mocked<Pick<RuleDoctorFindingsClient, 'updateFindingStatus'>>;

  const spaceContext: SpaceContext = { spaceId: 'my-space' };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('delegates to updateFindingStatus and returns noContent', async () => {
    const { ctx, response } = createRouteDependencies();
    const request = httpServerMock.createKibanaRequest({
      params: { finding_id: 'finding-1' },
      body: { status: 'dismissed' },
    });

    findingsClient.updateFindingStatus.mockResolvedValueOnce(undefined);

    const route = new UpdateFindingStatusRoute(
      ctx,
      request,
      findingsClient as unknown as RuleDoctorFindingsClient,
      spaceContext
    );
    await route.handle();

    expect(findingsClient.updateFindingStatus).toHaveBeenCalledWith(
      'finding-1',
      'dismissed',
      'my-space'
    );
    expect(response.noContent).toHaveBeenCalled();
  });

  it('returns 404 when finding is not found', async () => {
    const { ctx, response } = createRouteDependencies();
    const request = httpServerMock.createKibanaRequest({
      params: { finding_id: 'nonexistent' },
      body: { status: 'applied' },
    });

    findingsClient.updateFindingStatus.mockRejectedValueOnce(
      Boom.notFound('Finding nonexistent not found')
    );

    const route = new UpdateFindingStatusRoute(
      ctx,
      request,
      findingsClient as unknown as RuleDoctorFindingsClient,
      spaceContext
    );
    await route.handle();

    expect(response.customError).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 404 })
    );
  });
});
