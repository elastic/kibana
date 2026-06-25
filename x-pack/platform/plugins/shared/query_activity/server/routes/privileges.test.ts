/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kibanaResponseFactory } from '@kbn/core/server';
import { coreMock, httpServerMock, httpServiceMock } from '@kbn/core/server/mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { API_BASE_PATH } from '../../common/constants';
import { registerPrivilegesRoute } from './privileges';

describe(`GET ${API_BASE_PATH}/privileges`, () => {
  const setup = () => {
    const router = httpServiceMock.createRouter();
    const logger = loggingSystemMock.createLogger();

    registerPrivilegesRoute({ router, logger });

    const [[_config, handler]] = router.get.mock.calls;

    const coreContext = coreMock.createRequestHandlerContext();
    const context = coreMock.createCustomRequestHandlerContext({ core: coreContext });
    const esClient = coreContext.elasticsearch.client.asCurrentUser as any;

    return { handler, context, esClient, logger };
  };

  it('defaults to allowed when the security client is unavailable', async () => {
    const { handler, context, esClient } = setup();
    jest.spyOn(esClient, 'security', 'get').mockReturnValue(undefined);

    const request = httpServerMock.createKibanaRequest({
      method: 'get',
      path: `${API_BASE_PATH}/privileges`,
    });

    const response = await handler(context, request, kibanaResponseFactory);

    expect(response.status).toBe(200);
    expect(response.payload).toEqual({
      canCancelTasks: true,
      canViewTasks: true,
      missingClusterPrivileges: [],
    });
  });

  it('returns derived privileges when hasPrivileges is available', async () => {
    const { handler, context, esClient } = setup();

    const security = {
      hasPrivileges: jest.fn().mockResolvedValue({
        has_all_requested: false,
        cluster: { monitor: true, manage: false },
      }),
    };
    jest.spyOn(esClient, 'security', 'get').mockReturnValue(security);

    const request = httpServerMock.createKibanaRequest({
      method: 'get',
      path: `${API_BASE_PATH}/privileges`,
    });

    const response = await handler(context, request, kibanaResponseFactory);

    expect(response.status).toBe(200);
    expect(response.payload).toEqual({
      canCancelTasks: false,
      canViewTasks: true,
      missingClusterPrivileges: ['manage'],
    });
  });

  it('returns a safe default when privilege checks throw', async () => {
    const { handler, context, esClient, logger } = setup();

    const security = {
      hasPrivileges: jest.fn().mockRejectedValue(new Error('ES error')),
    };
    jest.spyOn(esClient, 'security', 'get').mockReturnValue(security);

    const request = httpServerMock.createKibanaRequest({
      method: 'get',
      path: `${API_BASE_PATH}/privileges`,
    });

    const response = await handler(context, request, kibanaResponseFactory);

    expect(response.status).toBe(200);
    expect(response.payload).toEqual({
      canCancelTasks: false,
      canViewTasks: false,
      missingClusterPrivileges: [],
    });
    expect(logger.warn).toHaveBeenCalled();
  });
});
