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
import { registerCancelRoute } from './cancel';

describe(`POST ${API_BASE_PATH}/cancel`, () => {
  const setup = () => {
    const router = httpServiceMock.createRouter();
    const logger = loggingSystemMock.createLogger();

    registerCancelRoute({ router, logger });

    const [[_config, handler]] = router.post.mock.calls;

    const coreContext = coreMock.createRequestHandlerContext();
    const context = coreMock.createCustomRequestHandlerContext({ core: coreContext });
    const esClient = coreContext.elasticsearch.client.asInternalUser;
    const asCurrentUserClient = coreContext.elasticsearch.client.asCurrentUser as any;

    return { handler, context, esClient, asCurrentUserClient, logger };
  };

  it('calls ES tasks.cancel and returns the result', async () => {
    const { handler, context, esClient, asCurrentUserClient } = setup();

    jest.spyOn(asCurrentUserClient, 'security', 'get').mockReturnValue({
      hasPrivileges: jest.fn().mockResolvedValue({ cluster: { manage: true } }),
    });

    esClient.tasks.cancel.mockResolvedValueOnce({ acknowledged: true } as any);

    const request = httpServerMock.createKibanaRequest({
      method: 'post',
      path: `${API_BASE_PATH}/cancel`,
      body: { taskId: 'node1:123' },
    });

    const response = await handler(context, request, kibanaResponseFactory);

    expect(esClient.tasks.cancel).toHaveBeenCalledWith({
      task_id: 'node1:123',
      wait_for_completion: false,
    });
    expect(response.status).toBe(200);
    expect(response.payload).toEqual({ acknowledged: true });
  });

  it('treats 404 as success to keep the operation idempotent', async () => {
    const { handler, context, esClient, asCurrentUserClient } = setup();

    jest.spyOn(asCurrentUserClient, 'security', 'get').mockReturnValue({
      hasPrivileges: jest.fn().mockResolvedValue({ cluster: { manage: true } }),
    });

    const error: any = new Error('Not found');
    error.statusCode = 404;
    esClient.tasks.cancel.mockRejectedValueOnce(error);

    const request = httpServerMock.createKibanaRequest({
      method: 'post',
      path: `${API_BASE_PATH}/cancel`,
      body: { taskId: 'node1:missing' },
    });

    const response = await handler(context, request, kibanaResponseFactory);

    expect(response.status).toBe(200);
    expect(response.payload).toEqual({ acknowledged: true });
  });

  it('returns 403 when the user lacks privileges to cancel tasks', async () => {
    const { handler, context, esClient, asCurrentUserClient } = setup();

    jest.spyOn(asCurrentUserClient, 'security', 'get').mockReturnValue({
      hasPrivileges: jest.fn().mockResolvedValue({ cluster: { manage: true } }),
    });

    const error: any = new Error('Forbidden');
    error.statusCode = 403;
    esClient.tasks.cancel.mockRejectedValueOnce(error);

    const request = httpServerMock.createKibanaRequest({
      method: 'post',
      path: `${API_BASE_PATH}/cancel`,
      body: { taskId: 'node1:forbidden' },
    });

    const response = await handler(context, request, kibanaResponseFactory);

    expect(response.status).toBe(403);
    expect(response.payload).toEqual({ message: 'Insufficient privileges to cancel query' });
  });
});
