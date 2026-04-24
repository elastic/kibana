/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import type { RuleDoctorFindingsClient } from '../../lib/rule_doctor_findings_client/rule_doctor_findings_client';
import type { RuleDoctorFindingDoc } from '../../resources/indices/rule_doctor_findings';
import { createRouteDependencies } from '../test_utils';
import { GetFindingRoute } from './get_finding_route';
import type { SpaceContext } from './space_context';

describe('GetFindingRoute', () => {
  const findingsClient = {
    getFinding: jest.fn(),
  } as unknown as jest.Mocked<Pick<RuleDoctorFindingsClient, 'getFinding'>>;

  const spaceContext: SpaceContext = { spaceId: 'default' };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the finding doc on success', async () => {
    const { ctx, response } = createRouteDependencies();
    const request = httpServerMock.createKibanaRequest({
      params: { finding_id: 'finding-1' },
    });

    const finding = { finding_id: 'finding-1', status: 'open' } as unknown as RuleDoctorFindingDoc;
    findingsClient.getFinding.mockResolvedValueOnce(finding);

    const route = new GetFindingRoute(
      ctx,
      request,
      findingsClient as unknown as RuleDoctorFindingsClient,
      spaceContext
    );
    await route.handle();

    expect(findingsClient.getFinding).toHaveBeenCalledWith('finding-1', 'default');
    expect(response.ok).toHaveBeenCalledWith({ body: finding });
  });

  it('returns 404 when finding is not found', async () => {
    const { ctx, response } = createRouteDependencies();
    const request = httpServerMock.createKibanaRequest({
      params: { finding_id: 'nonexistent' },
    });

    findingsClient.getFinding.mockRejectedValueOnce(Boom.notFound('Finding nonexistent not found'));

    const route = new GetFindingRoute(
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
