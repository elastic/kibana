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
import { ListFindingsRoute } from './list_findings_route';
import type { SpaceContext } from './space_context';

describe('ListFindingsRoute', () => {
  const findingsClient = {
    listFindings: jest.fn(),
  } as unknown as jest.Mocked<Pick<RuleDoctorFindingsClient, 'listFindings'>>;

  const spaceContext: SpaceContext = { spaceId: 'default' };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('forwards query params to the findings client with page/perPage conversion', async () => {
    const { ctx, response } = createRouteDependencies();
    const request = httpServerMock.createKibanaRequest({
      query: { page: 2, perPage: 10, status: 'open' },
    });

    findingsClient.listFindings.mockResolvedValueOnce({ items: [], total: 0 });

    const route = new ListFindingsRoute(
      ctx,
      request,
      findingsClient as unknown as RuleDoctorFindingsClient,
      spaceContext
    );
    await route.handle();

    expect(findingsClient.listFindings).toHaveBeenCalledWith({
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

  it('splits comma-separated rule_ids into an array', async () => {
    const { ctx, response } = createRouteDependencies();
    const request = httpServerMock.createKibanaRequest({
      query: { page: 1, perPage: 20, rule_ids: 'abc,def,ghi' },
    });

    findingsClient.listFindings.mockResolvedValueOnce({ items: [], total: 0 });

    const route = new ListFindingsRoute(
      ctx,
      request,
      findingsClient as unknown as RuleDoctorFindingsClient,
      spaceContext
    );
    await route.handle();

    expect(findingsClient.listFindings).toHaveBeenCalledWith(
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

    findingsClient.listFindings.mockRejectedValueOnce(Boom.internal('es failure'));

    const route = new ListFindingsRoute(
      ctx,
      request,
      findingsClient as unknown as RuleDoctorFindingsClient,
      spaceContext
    );
    await route.handle();

    expect(response.customError).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 500 })
    );
  });
});
