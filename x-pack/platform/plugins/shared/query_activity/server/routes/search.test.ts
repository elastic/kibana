/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kibanaResponseFactory } from '@kbn/core/server';
import { coreMock, httpServerMock, httpServiceMock } from '@kbn/core/server/mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import {
  API_BASE_PATH,
  QUERY_ACTIVITY_MIN_RUNNING_TIME_DEFAULT_MS,
  QUERY_ACTIVITY_MIN_RUNNING_TIME_SETTING,
} from '../../common/constants';
import { registerSearchRoute } from './search';

describe(`GET ${API_BASE_PATH}/search`, () => {
  const setup = () => {
    const router = httpServiceMock.createRouter();
    const logger = loggingSystemMock.createLogger();

    registerSearchRoute({ router, logger });

    const [[_config, handler]] = router.get.mock.calls;

    const coreContext = coreMock.createRequestHandlerContext();
    coreContext.uiSettings.client.get.mockImplementation(async (key: string) => {
      if (key === QUERY_ACTIVITY_MIN_RUNNING_TIME_SETTING) {
        return QUERY_ACTIVITY_MIN_RUNNING_TIME_DEFAULT_MS;
      }
    });
    const context = coreMock.createCustomRequestHandlerContext({ core: coreContext });
    const esClient = coreContext.elasticsearch.client.asInternalUser;
    const asCurrentUser = coreContext.elasticsearch.client.asCurrentUser as any;
    jest.spyOn(asCurrentUser, 'security', 'get').mockReturnValue({
      hasPrivileges: jest.fn().mockResolvedValue({ cluster: { monitor: true } }),
    });

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
          running_time_in_nanos: QUERY_ACTIVITY_MIN_RUNNING_TIME_DEFAULT_MS * 1_000_000 + 1,
          cancellable: true,
          cancelled: false,
        },
      ],
    } as any);
    esClient.tasks.get.mockResolvedValueOnce({
      completed: false,
      task: {
        node: 'node1',
        id: 1,
        type: 'transport',
        action: 'indices:data/read/search',
        start_time_in_millis: 1_000_000,
        running_time_in_nanos: QUERY_ACTIVITY_MIN_RUNNING_TIME_DEFAULT_MS * 1_000_000 + 1,
        cancellable: true,
        cancelled: false,
        headers: { 'X-Opaque-Id': 'req1;kibana:application:discover:new' },
        description:
          'indices[test], types[], search_type[QUERY_THEN_FETCH], source[{"query":{"match_all":{}}}]',
      },
    } as any);

    const request = httpServerMock.createKibanaRequest({
      method: 'get',
      path: `${API_BASE_PATH}/search`,
    });

    const response = await handler(context, request, kibanaResponseFactory);

    expect(esClient.tasks.list).toHaveBeenCalledWith(
      expect.objectContaining({
        detailed: false,
        group_by: 'none',
        actions: [
          'indices:data/read/search',
          'indices:data/read/search/template',
          'indices:data/read/esql',
          'indices:data/read/esql[a]',
          'indices:data/read/eql',
          'indices:data/read/eql[a]',
          'indices:data/read/sql',
          'indices:data/read/sql[a]',
          'indices:data/read/msearch',
          'indices:data/read/msearch/template',
          'indices:data/read/async_search/submit',
        ],
        filter_path: [
          'tasks.node',
          'tasks.id',
          'tasks.action',
          'tasks.parent_task_id',
          'tasks.running_time_in_nanos',
        ],
      })
    );
    expect(esClient.tasks.get).toHaveBeenCalledWith(
      expect.objectContaining({
        task_id: 'node1:1',
        wait_for_completion: false,
        filter_path: [
          'completed',
          'task.node',
          'task.id',
          'task.action',
          'task.description',
          'task.start_time_in_millis',
          'task.running_time_in_nanos',
          'task.cancellable',
          'task.cancelled',
          'task.headers',
          'task.parent_task_id',
        ],
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

  it('only fetches details for qualifying root query tasks', async () => {
    const { handler, context, esClient } = setup();
    const runningTime = QUERY_ACTIVITY_MIN_RUNNING_TIME_DEFAULT_MS * 1_000_000 + 1;

    esClient.tasks.list.mockResolvedValueOnce({
      tasks: [
        {
          node: 'node1',
          id: 1,
          action: 'indices:data/read/esql',
          running_time_in_nanos: runningTime,
        },
        {
          node: 'node1',
          id: 2,
          action: 'indices:data/read/esql/compute',
          running_time_in_nanos: runningTime,
          parent_task_id: 'node1:1',
        },
        {
          node: 'node1',
          id: 3,
          action: 'indices:data/read/search',
          running_time_in_nanos: 1,
        },
        {
          node: 'node1',
          id: 4,
          action: 'indices:data/write/bulk',
          running_time_in_nanos: runningTime,
        },
      ],
    } as any);
    esClient.tasks.get.mockResolvedValueOnce({
      completed: false,
      task: {
        node: 'node1',
        id: 1,
        type: 'transport',
        action: 'indices:data/read/esql',
        start_time_in_millis: 1_000_000,
        running_time_in_nanos: runningTime,
        cancellable: true,
        cancelled: false,
        headers: {},
        description: 'FROM logs-* | LIMIT 10',
      },
    } as any);

    const request = httpServerMock.createKibanaRequest({
      method: 'get',
      path: `${API_BASE_PATH}/search`,
    });
    const response = await handler(context, request, kibanaResponseFactory);

    expect(esClient.tasks.get).toHaveBeenCalledTimes(1);
    expect(esClient.tasks.get).toHaveBeenCalledWith(
      expect.objectContaining({ task_id: 'node1:1' })
    );
    expect(response.status).toBe(200);
    expect(response.payload).toEqual({
      queries: [expect.objectContaining({ taskId: 'node1:1', queryType: 'ES|QL' })],
    });
  });

  it.each([
    {
      name: 'returns 404',
      getResult: () => Promise.reject({ meta: { statusCode: 404 } }),
    },
    {
      name: 'reports that the task completed',
      getResult: () =>
        Promise.resolve({
          completed: true,
          task: {
            node: 'node1',
            id: 1,
            type: 'transport',
            action: 'indices:data/read/search',
            start_time_in_millis: 1_000_000,
            running_time_in_nanos: QUERY_ACTIVITY_MIN_RUNNING_TIME_DEFAULT_MS * 1_000_000 + 1,
            cancellable: true,
            headers: {},
          },
        }),
    },
  ])('omits a task that $name during enrichment', async ({ getResult }) => {
    const { handler, context, esClient } = setup();

    esClient.tasks.list.mockResolvedValueOnce({
      tasks: [
        {
          node: 'node1',
          id: 1,
          action: 'indices:data/read/search',
          running_time_in_nanos: QUERY_ACTIVITY_MIN_RUNNING_TIME_DEFAULT_MS * 1_000_000 + 1,
        },
      ],
    } as any);
    esClient.tasks.get.mockReturnValueOnce(getResult() as any);

    const request = httpServerMock.createKibanaRequest({
      method: 'get',
      path: `${API_BASE_PATH}/search`,
    });
    const response = await handler(context, request, kibanaResponseFactory);

    expect(response.status).toBe(200);
    expect(response.payload).toEqual({ queries: [] });
  });

  it('limits concurrent task detail requests', async () => {
    const { handler, context, esClient } = setup();
    const runningTime = QUERY_ACTIVITY_MIN_RUNNING_TIME_DEFAULT_MS * 1_000_000 + 1;
    const taskCount = 11;
    let activeRequests = 0;
    let maxActiveRequests = 0;
    const pendingResolvers: Array<() => void> = [];

    esClient.tasks.list.mockResolvedValueOnce({
      tasks: Array.from({ length: taskCount }, (_, index) => ({
        node: 'node1',
        id: index + 1,
        action: 'indices:data/read/search',
        running_time_in_nanos: runningTime,
      })),
    } as any);
    esClient.tasks.get.mockImplementation(
      ({ task_id: taskId }) =>
        new Promise((resolve) => {
          activeRequests++;
          maxActiveRequests = Math.max(maxActiveRequests, activeRequests);
          pendingResolvers.push(() => {
            activeRequests--;
            const id = Number(taskId.split(':')[1]);
            resolve({
              completed: false,
              task: {
                node: 'node1',
                id,
                type: 'transport',
                action: 'indices:data/read/search',
                start_time_in_millis: 1_000_000,
                running_time_in_nanos: runningTime,
                cancellable: true,
                cancelled: false,
                headers: {},
                description: 'indices[test], source[{"query":{"match_all":{}}}]',
              },
            });
          });
        }) as any
    );

    const request = httpServerMock.createKibanaRequest({
      method: 'get',
      path: `${API_BASE_PATH}/search`,
    });
    const responsePromise = handler(context, request, kibanaResponseFactory);

    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(esClient.tasks.get).toHaveBeenCalledTimes(10);
    expect(maxActiveRequests).toBe(10);

    pendingResolvers.splice(0).forEach((resolve) => resolve());
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(esClient.tasks.get).toHaveBeenCalledTimes(taskCount);
    expect(maxActiveRequests).toBe(10);

    pendingResolvers.splice(0).forEach((resolve) => resolve());
    const response = await responsePromise;
    expect(response.status).toBe(200);
    expect(response.payload.queries).toHaveLength(taskCount);
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
    expect(response.payload).toEqual({ message: 'Failed to fetch query activity' });
    expect(logger.error).toHaveBeenCalled();
  });

  it('returns an error response when task enrichment fails', async () => {
    const { handler, context, esClient, logger } = setup();

    esClient.tasks.list.mockResolvedValueOnce({
      tasks: [
        {
          node: 'node1',
          id: 1,
          action: 'indices:data/read/search',
          running_time_in_nanos: QUERY_ACTIVITY_MIN_RUNNING_TIME_DEFAULT_MS * 1_000_000 + 1,
        },
      ],
    } as any);
    esClient.tasks.get.mockRejectedValueOnce({ meta: { statusCode: 503 } });

    const request = httpServerMock.createKibanaRequest({
      method: 'get',
      path: `${API_BASE_PATH}/search`,
    });
    const response = await handler(context, request, kibanaResponseFactory);

    expect(response.status).toBe(503);
    expect(response.payload).toEqual({ message: 'Failed to fetch query activity' });
    expect(logger.error).toHaveBeenCalled();
  });
});
