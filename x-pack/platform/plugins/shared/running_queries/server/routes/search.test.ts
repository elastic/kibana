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
import { RUNNING_TIME_THRESHOLD_NANOS } from '../lib/transform_tasks';
import { registerSearchRoute } from './search';

describe(`GET ${API_BASE_PATH}/search`, () => {
  const setup = () => {
    const router = httpServiceMock.createRouter();
    const logger = loggingSystemMock.createLogger();

    registerSearchRoute({ router, logger });

    const [[_config, handler]] = router.get.mock.calls;

    const coreContext = coreMock.createRequestHandlerContext();
    const context = coreMock.createCustomRequestHandlerContext({ core: coreContext });
    const esClient = coreContext.elasticsearch.client.asCurrentUser;

    return { handler, context, esClient, logger };
  };

  it('returns transformed running queries from the ES tasks list', async () => {
    const { handler, context, esClient } = setup();

    esClient.tasks.list.mockResolvedValueOnce({
      tasks: [
        {
          node: 'node1',
          id: 1,
          type: 'transport',
          action: 'indices:data/read/search',
          start_time_in_millis: 1_000_000,
          running_time_in_nanos: RUNNING_TIME_THRESHOLD_NANOS + 1,
          cancellable: true,
          cancelled: false,
          headers: { 'X-Opaque-Id': 'req1;kibana:application:discover:new' },
          description:
            'indices[test], types[], search_type[QUERY_THEN_FETCH], source[{"query":{"match_all":{}}}]',
        },
      ],
    } as any);

    const request = httpServerMock.createKibanaRequest({
      method: 'get',
      path: `${API_BASE_PATH}/search`,
    });

    const response = await handler(context, request, kibanaResponseFactory);

    expect(esClient.tasks.list).toHaveBeenCalledWith(
      expect.objectContaining({
        detailed: true,
        group_by: 'none',
        actions: expect.arrayContaining([
          'indices:data/read/search*',
          'indices:data/read/esql*',
          'indices:data/read/eql*',
          'indices:data/read/sql*',
          'indices:data/read/msearch*',
          'indices:data/read/async_search*',
        ]),
      })
    );

    expect(response.status).toBe(200);
    expect(response.payload).toEqual({
      queries: [
        expect.objectContaining({
          taskId: 'node1:1',
          queryType: 'DSL',
          source: 'Discover',
        }),
      ],
    });
  });

  it('returns an error response when ES tasks.list throws', async () => {
    const { handler, context, esClient, logger } = setup();

    const error: any = new Error('ES unavailable');
    error.statusCode = 503;
    esClient.tasks.list.mockRejectedValueOnce(error);

    const request = httpServerMock.createKibanaRequest({
      method: 'get',
      path: `${API_BASE_PATH}/search`,
    });

    const response = await handler(context, request, kibanaResponseFactory);

    expect(response.status).toBe(503);
    expect(response.payload).toEqual({ message: 'Failed to fetch running queries' });
    expect(logger.error).toHaveBeenCalled();
  });
});
