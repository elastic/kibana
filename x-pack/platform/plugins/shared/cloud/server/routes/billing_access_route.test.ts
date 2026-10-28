/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, httpServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { RequestHandlerContext } from '@kbn/core/server';
import { kibanaResponseFactory } from '@kbn/core/server';
import type { RouteOptions } from '.';
import { setGetBillingAccessRoute } from './billing_access_route';

describe('GET /internal/cloud/billing_access', () => {
  const setup = (checker?: jest.Mock) => {
    const router = httpServiceMock.createSetupContract().createRouter();
    setGetBillingAccessRoute({
      router,
      logger: loggingSystemMock.createLogger(),
      getBillingAccessChecker: () => checker,
    } as unknown as RouteOptions);

    const [routeDefinition, routeHandler] =
      router.versioned.get.mock.results[0].value.addVersion.mock.calls[0];
    const request = httpServerMock.createKibanaRequest({ method: 'get' });

    return {
      routeDefinition,
      handle: () => routeHandler({} as RequestHandlerContext, request, kibanaResponseFactory),
      request,
    };
  };

  it('reports that access cannot be checked when no checker is registered', async () => {
    const { handle } = setup();

    await expect(handle()).resolves.toEqual(
      expect.objectContaining({ status: 200, payload: { hasAccess: null } })
    );
  });

  it('asks the registered checker on behalf of the current user', async () => {
    const checker = jest.fn().mockResolvedValue(true);
    const { handle, request } = setup(checker);

    await expect(handle()).resolves.toEqual(
      expect.objectContaining({ status: 200, payload: { hasAccess: true } })
    );
    expect(checker).toHaveBeenCalledWith(request);
  });

  it('reports a denied check', async () => {
    const { handle } = setup(jest.fn().mockResolvedValue(false));

    await expect(handle()).resolves.toEqual(
      expect.objectContaining({ status: 200, payload: { hasAccess: false } })
    );
  });

  it('responds with 503 when the checker fails', async () => {
    const { handle } = setup(jest.fn().mockRejectedValue(new Error('UIAM is unreachable')));

    await expect(handle()).resolves.toEqual(
      expect.objectContaining({
        status: 503,
        payload: { message: 'Billing access could not be checked.' },
      })
    );
  });
});
