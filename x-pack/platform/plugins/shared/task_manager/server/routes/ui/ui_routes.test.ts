/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import {
  elasticsearchServiceMock,
  httpServiceMock,
  loggingSystemMock,
} from '@kbn/core/server/mocks';
import { mockHandlerArguments } from '../_mock_handler_arguments';
import { TaskTypeDictionary } from '../../task_type_dictionary';
import { taskExecutionControlServiceMock } from '../../execution_control/task_execution_control_service.mock';
import type { TaskManagerConfig } from '../../config';
import { taskManagerUiRoutes } from './ui_routes';

const TASK_INDEX = '.kibana_task_manager';
const EVENT_LOG_INDEX = '.kibana-event-log-*';

const RUNS_WINDOW = { start: '2026-11-03T12:00:00.000Z', end: '2026-11-04T12:00:00.000Z' };
const IN_RUNS_WINDOW = {
  range: { '@timestamp': { gte: '2026-11-03T12:00:00.000Z', lte: '2026-11-04T12:00:00.000Z' } },
};

const config = {
  max_attempts: 3,
  poll_interval: 3000,
  unsafe: { exclude_task_types: ['excluded:*'] },
} as unknown as TaskManagerConfig;

const createSearchResponse = (
  overrides: Partial<estypes.SearchResponse> = {}
): estypes.SearchResponse => ({
  took: 1,
  timed_out: false,
  _shards: { total: 1, successful: 1, failed: 0 },
  hits: { total: { value: 0, relation: 'eq' }, hits: [] },
  ...overrides,
});

const setup = ({ eventLogIndexPattern }: { eventLogIndexPattern?: string } = {}) => {
  const router = httpServiceMock.createRouter();
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  esClient.search.mockResolvedValue(createSearchResponse());
  const executionControlService = taskExecutionControlServiceMock.create();
  (executionControlService.read as jest.Mock).mockResolvedValue({
    paused: false,
    paused_task_types: ['report:execute'],
    updated_at: '2026-11-02T00:00:00.000Z',
  });
  const discoveryService = {
    getActiveKibanaNodes: jest
      .fn()
      .mockResolvedValue([{ id: 'node-1', attributes: { last_seen: '2026-11-02T11:59:00.000Z' } }]),
  };
  const definitions = new TaskTypeDictionary(loggingSystemMock.createLogger());
  definitions.registerTaskDefinitions({
    'report:execute': { title: 'Reporting', timeout: '2m', createTaskRunner: jest.fn() },
  });

  taskManagerUiRoutes({
    router,
    config,
    taskManagerIndex: TASK_INDEX,
    getStartDependencies: async () => ({
      esClient,
      executionControlService: executionControlService as never,
      discoveryService: discoveryService as never,
    }),
    getDefinitions: () => definitions,
    getEventLogIndexPattern: () => eventLogIndexPattern,
  });

  const getHandler = (path: string) => {
    const call = router.get.mock.calls.find(([routeConfig]) => routeConfig.path === path);
    if (!call) {
      throw new Error(`route ${path} not registered`);
    }
    return call[1] as unknown as (...args: unknown[]) => Promise<unknown>;
  };

  return { router, esClient, getHandler };
};

describe('taskManagerUiRoutes', () => {
  it('registers internal routes that require the taskManager API privilege', () => {
    const { router } = setup();

    expect(router.get.mock.calls.map(([routeConfig]) => routeConfig.path)).toEqual([
      '/internal/task_manager/ui/overview',
      '/internal/task_manager/ui/tasks',
      '/internal/task_manager/ui/tasks/{id}',
    ]);
    for (const [routeConfig] of router.get.mock.calls) {
      expect(routeConfig.options?.access).toBe('internal');
      expect(routeConfig.security).toEqual({
        authz: { requiredPrivileges: ['manage_taskManager'] },
      });
    }
  });

  describe('overview', () => {
    it('combines task counts, run history, nodes and execution control', async () => {
      const { esClient, getHandler } = setup({ eventLogIndexPattern: EVENT_LOG_INDEX });
      esClient.search
        .mockResolvedValueOnce(
          createSearchResponse({
            hits: { total: { value: 5, relation: 'eq' }, hits: [] },
            aggregations: {
              status: { buckets: [{ key: 'idle', doc_count: 5 }] },
              overdue: { doc_count: 1 },
              taskType: {
                buckets: [
                  {
                    key: 'report:execute',
                    doc_count: 5,
                    status: { buckets: [{ key: 'idle', doc_count: 5 }] },
                    overdue: { doc_count: 1 },
                  },
                ],
              },
            } as Record<string, estypes.AggregationsAggregate>,
          })
        )
        .mockResolvedValueOnce(
          createSearchResponse({
            aggregations: {
              taskType: {
                buckets: [
                  {
                    key: 'removed:type',
                    doc_count: 1,
                    outcome: { buckets: [{ key: 'failure', doc_count: 1 }] },
                    avgDuration: { value: 1_000_000 },
                    durationPercentiles: { values: { '95.0': 1_000_000 } },
                    failures: {
                      doc_count: 1,
                      tasks: { value: 1 },
                      latest: { hits: { hits: [] } },
                    },
                  },
                ],
              },
            } as Record<string, estypes.AggregationsAggregate>,
          })
        );
      const [context, req, res] = mockHandlerArguments({}, { query: RUNS_WINDOW }, ['ok']);

      await getHandler('/internal/task_manager/ui/overview')(context, req, res);

      expect(esClient.search).toHaveBeenCalledTimes(2);
      expect(esClient.search.mock.calls[1][0]).toMatchObject({
        index: EVENT_LOG_INDEX,
        query: { bool: { filter: expect.arrayContaining([IN_RUNS_WINDOW]) } },
      });
      expect(res.ok).toHaveBeenCalledWith({
        body: expect.objectContaining({
          window: RUNS_WINDOW,
          event_log_available: true,
          totals: { tasks: 5, overdue: 1, by_status: { idle: 5 } },
          nodes: [{ id: 'node-1', last_seen: '2026-11-02T11:59:00.000Z' }],
          execution_control: { paused: false, paused_task_types: ['report:execute'] },
          excluded_task_types: ['excluded:*'],
          task_types: [
            expect.objectContaining({
              task_type: 'removed:type',
              registered: false,
              tasks: 0,
              runs: expect.objectContaining({ failure: 1, failed_tasks: 1, avg_duration_ms: 1 }),
            }),
            expect.objectContaining({
              task_type: 'report:execute',
              registered: true,
              tasks: 5,
              overdue: 1,
              definition: expect.objectContaining({ title: 'Reporting', max_attempts: 3 }),
            }),
          ],
        }),
      });
    });

    it('skips the event log when its index pattern was not registered', async () => {
      const { esClient, getHandler } = setup();
      esClient.search.mockResolvedValueOnce(createSearchResponse());
      const [context, req, res] = mockHandlerArguments({}, { query: RUNS_WINDOW }, ['ok']);

      await getHandler('/internal/task_manager/ui/overview')(context, req, res);

      expect(esClient.search).toHaveBeenCalledTimes(1);
      expect(res.ok).toHaveBeenCalledWith({
        body: expect.objectContaining({ event_log_available: false, task_types: [] }),
      });
    });

    it('summarizes the runs of the last 24 hours when no window is requested', async () => {
      const { esClient, getHandler } = setup({ eventLogIndexPattern: EVENT_LOG_INDEX });
      const [context, req, res] = mockHandlerArguments({}, { query: {} }, ['ok']);

      await getHandler('/internal/task_manager/ui/overview')(context, req, res);

      const { window } = (res.ok as jest.Mock).mock.calls[0][0].body;
      expect(Date.parse(window.end) - Date.parse(window.start)).toBe(24 * 60 * 60 * 1000);
      expect(esClient.search.mock.calls[1][0]).toMatchObject({
        query: {
          bool: {
            filter: expect.arrayContaining([
              { range: { '@timestamp': { gte: window.start, lte: window.end } } },
            ]),
          },
        },
      });
    });
  });

  describe('tasks', () => {
    it('returns a page of task summaries', async () => {
      const { esClient, getHandler } = setup();
      esClient.search.mockResolvedValueOnce(
        createSearchResponse({
          hits: {
            total: { value: 41, relation: 'eq' },
            hits: [
              {
                _index: TASK_INDEX,
                _id: 'task:abc',
                _source: { task: { taskType: 'report:execute', status: 'idle', enabled: true } },
              },
            ],
          },
        })
      );
      const query = {
        ...RUNS_WINDOW,
        task_type: 'report:execute',
        overdue: false,
        page: 2,
        per_page: 20,
        sort_field: 'run_at',
        sort_order: 'asc',
      };
      const [context, req, res] = mockHandlerArguments({}, { query }, ['ok']);

      await getHandler('/internal/task_manager/ui/tasks')(context, req, res);

      expect(esClient.search.mock.calls[0][0]).toMatchObject({ index: TASK_INDEX, from: 20 });
      expect(res.ok).toHaveBeenCalledWith({
        body: {
          page: 2,
          per_page: 20,
          total: 41,
          tasks: [expect.objectContaining({ id: 'abc', task_type: 'report:execute' })],
        },
      });
    });
  });

  describe('task detail', () => {
    const detailQuery = RUNS_WINDOW;

    it('returns 404 when the task does not exist', async () => {
      const { esClient, getHandler } = setup();
      esClient.search.mockResolvedValueOnce(createSearchResponse());
      const [context, req, res] = mockHandlerArguments(
        {},
        { params: { id: 'missing' }, query: detailQuery },
        ['ok', 'notFound']
      );

      await getHandler('/internal/task_manager/ui/tasks/{id}')(context, req, res);

      expect(res.notFound).toHaveBeenCalledWith({ body: { message: 'Task missing not found' } });
    });

    it('returns 404 when the task does not exist and has no recorded runs', async () => {
      const { esClient, getHandler } = setup({ eventLogIndexPattern: EVENT_LOG_INDEX });
      esClient.search
        .mockResolvedValueOnce(createSearchResponse())
        .mockResolvedValueOnce(createSearchResponse());
      const [context, req, res] = mockHandlerArguments(
        {},
        { params: { id: 'missing' }, query: detailQuery },
        ['ok', 'notFound']
      );

      await getHandler('/internal/task_manager/ui/tasks/{id}')(context, req, res);

      expect(res.notFound).toHaveBeenCalledWith({ body: { message: 'Task missing not found' } });
    });

    it('explains a removed task from the run history left in the event log', async () => {
      const { esClient, getHandler } = setup({ eventLogIndexPattern: EVENT_LOG_INDEX });
      esClient.search.mockResolvedValueOnce(createSearchResponse()).mockResolvedValueOnce(
        createSearchResponse({
          hits: {
            hits: [
              {
                _index: EVENT_LOG_INDEX,
                _id: '1',
                _source: {
                  '@timestamp': '2026-11-02T11:00:00.000Z',
                  event: { outcome: 'failure', duration: 1_000_000 },
                  error: { message: 'error indexing documents' },
                  kibana: { task: { id: 'removed', type: 'report:execute' } },
                },
              },
            ],
          },
        })
      );
      const [context, req, res] = mockHandlerArguments(
        {},
        { params: { id: 'removed' }, query: detailQuery },
        ['ok', 'notFound']
      );

      await getHandler('/internal/task_manager/ui/tasks/{id}')(context, req, res);

      const { body } = (res.ok as jest.Mock).mock.calls[0][0];
      expect(body).not.toHaveProperty('task');
      expect(body).toEqual(
        expect.objectContaining({
          task_type: 'report:execute',
          definition: expect.objectContaining({ title: 'Reporting' }),
          explanation: {
            verdict: 'attention',
            reasons: [
              { code: 'removed' },
              {
                code: 'last_run_failed',
                consecutive_failures: 1,
                runs_checked: 1,
                failed_at: '2026-11-02T11:00:00.000Z',
                error_message: 'error indexing documents',
              },
            ],
          },
          recent_runs: [expect.objectContaining({ outcome: 'failure' })],
        })
      );
    });

    it('returns the task, its explanation and recent runs', async () => {
      const { esClient, getHandler } = setup({ eventLogIndexPattern: EVENT_LOG_INDEX });
      esClient.search
        .mockResolvedValueOnce(
          createSearchResponse({
            hits: {
              total: { value: 1, relation: 'eq' },
              hits: [
                {
                  _index: TASK_INDEX,
                  _id: 'task:abc',
                  _source: {
                    task: {
                      taskType: 'report:execute',
                      status: 'idle',
                      enabled: true,
                      runAt: '2099-01-01T00:00:00.000Z',
                      attempts: 0,
                    },
                  },
                },
              ],
            },
          })
        )
        .mockResolvedValueOnce(
          createSearchResponse({
            hits: {
              hits: [
                {
                  _index: EVENT_LOG_INDEX,
                  _id: '1',
                  _source: {
                    '@timestamp': '2026-11-02T11:00:00.000Z',
                    event: { outcome: 'success', duration: 1_000_000 },
                  },
                },
              ],
            },
          })
        );
      const [context, req, res] = mockHandlerArguments(
        {},
        { params: { id: 'abc' }, query: detailQuery },
        ['ok', 'notFound']
      );

      await getHandler('/internal/task_manager/ui/tasks/{id}')(context, req, res);

      expect(esClient.search.mock.calls[1][0]).toMatchObject({ index: EVENT_LOG_INDEX });
      expect(res.ok).toHaveBeenCalledWith({
        body: expect.objectContaining({
          task: expect.objectContaining({ id: 'abc', task_type: 'report:execute' }),
          task_type: 'report:execute',
          definition: expect.objectContaining({ title: 'Reporting', timeout: '2m' }),
          explanation: { verdict: 'blocked', reasons: [{ code: 'task_type_paused' }] },
          event_log_available: true,
          recent_runs: [
            expect.objectContaining({ timestamp: '2026-11-02T11:00:00.000Z', outcome: 'success' }),
          ],
        }),
      });
    });

    it('explains a task whose last recorded run failed', async () => {
      const { esClient, getHandler } = setup({ eventLogIndexPattern: EVENT_LOG_INDEX });
      esClient.search
        .mockResolvedValueOnce(
          createSearchResponse({
            hits: {
              total: { value: 1, relation: 'eq' },
              hits: [
                {
                  _index: TASK_INDEX,
                  _id: 'task:abc',
                  _source: { task: { taskType: 'report:execute', status: 'idle', enabled: true } },
                },
              ],
            },
          })
        )
        .mockResolvedValueOnce(
          createSearchResponse({
            hits: {
              hits: [
                {
                  _index: EVENT_LOG_INDEX,
                  _id: '1',
                  _source: {
                    '@timestamp': '2026-11-02T11:00:00.000Z',
                    event: { outcome: 'failure', duration: 1_000_000 },
                    error: { message: 'Boom' },
                  },
                },
              ],
            },
          })
        );
      const [context, req, res] = mockHandlerArguments(
        {},
        { params: { id: 'abc' }, query: detailQuery },
        ['ok', 'notFound']
      );

      await getHandler('/internal/task_manager/ui/tasks/{id}')(context, req, res);

      expect(res.ok).toHaveBeenCalledWith({
        body: expect.objectContaining({
          explanation: {
            verdict: 'blocked',
            reasons: [
              { code: 'task_type_paused' },
              {
                code: 'last_run_failed',
                consecutive_failures: 1,
                runs_checked: 1,
                failed_at: '2026-11-02T11:00:00.000Z',
                error_message: 'Boom',
              },
            ],
          },
        }),
      });
    });

    it('returns the failures in the window, which can be older than the recent runs', async () => {
      const { esClient, getHandler } = setup({ eventLogIndexPattern: EVENT_LOG_INDEX });
      esClient.search
        .mockResolvedValueOnce(
          createSearchResponse({
            hits: {
              total: { value: 1, relation: 'eq' },
              hits: [
                {
                  _index: TASK_INDEX,
                  _id: 'task:abc',
                  _source: { task: { taskType: 'report:execute', status: 'idle', enabled: true } },
                },
              ],
            },
          })
        )
        .mockResolvedValueOnce(
          createSearchResponse({
            hits: {
              hits: [
                {
                  _index: EVENT_LOG_INDEX,
                  _id: '2',
                  _source: {
                    '@timestamp': '2026-11-02T11:00:00.000Z',
                    event: { outcome: 'success' },
                  },
                },
              ],
            },
          })
        )
        .mockResolvedValueOnce(
          createSearchResponse({
            hits: {
              total: { value: 2, relation: 'eq' },
              hits: [
                {
                  _index: EVENT_LOG_INDEX,
                  _id: '1',
                  _source: {
                    '@timestamp': '2026-10-31T13:26:34.000Z',
                    event: { outcome: 'failure' },
                    error: { message: 'Request timed out' },
                    kibana: { task: { id: 'abc', type: 'report:execute' } },
                  },
                },
              ],
            },
          })
        );
      const [context, req, res] = mockHandlerArguments(
        {},
        { params: { id: 'abc' }, query: detailQuery },
        ['ok', 'notFound']
      );

      await getHandler('/internal/task_manager/ui/tasks/{id}')(context, req, res);

      expect(esClient.search.mock.calls[2][0]).toMatchObject({
        index: EVENT_LOG_INDEX,
        track_total_hits: true,
        size: 1,
        query: {
          bool: {
            filter: expect.arrayContaining([
              { term: { 'event.outcome': 'failure' } },
              IN_RUNS_WINDOW,
              { term: { 'kibana.task.id': 'abc' } },
            ]),
          },
        },
      });
      expect(res.ok).toHaveBeenCalledWith({
        body: expect.objectContaining({
          recent_runs: [expect.objectContaining({ outcome: 'success' })],
          failures_in_window: {
            window: RUNS_WINDOW,
            count: 2,
            last_failure: {
              at: '2026-10-31T13:26:34.000Z',
              outcome: 'failure',
              error_message: 'Request timed out',
            },
          },
        }),
      });
    });

    it('omits the failures in the window when the task did not fail', async () => {
      const { esClient, getHandler } = setup({ eventLogIndexPattern: EVENT_LOG_INDEX });
      esClient.search.mockResolvedValueOnce(
        createSearchResponse({
          hits: {
            total: { value: 1, relation: 'eq' },
            hits: [
              {
                _index: TASK_INDEX,
                _id: 'task:abc',
                _source: { task: { taskType: 'report:execute', status: 'idle', enabled: true } },
              },
            ],
          },
        })
      );
      const [context, req, res] = mockHandlerArguments(
        {},
        { params: { id: 'abc' }, query: detailQuery },
        ['ok', 'notFound']
      );

      await getHandler('/internal/task_manager/ui/tasks/{id}')(context, req, res);

      expect(esClient.search).toHaveBeenCalledTimes(3);
      expect((res.ok as jest.Mock).mock.calls[0][0].body).not.toHaveProperty('failures_in_window');
    });
  });

  describe('tasks with failure history', () => {
    const tasksQuery = {
      ...RUNS_WINDOW,
      overdue: false,
      page: 1,
      per_page: 20,
      sort_field: 'run_at',
      sort_order: 'asc',
    };
    const createStoredTasksResponse = (total: number, taskIds: string[]) =>
      createSearchResponse({
        hits: {
          total: { value: total, relation: 'eq' },
          hits: taskIds.map((taskId) => ({
            _index: TASK_INDEX,
            _id: `task:${taskId}`,
            _source: { task: { taskType: 'actions:.index', status: 'idle', enabled: true } },
          })),
        },
      });
    const createRunsResponse = (runs: Array<{ taskId: string; outcome: string }>) =>
      createSearchResponse({
        hits: {
          hits: runs.map(({ taskId, outcome }) => ({
            _index: EVENT_LOG_INDEX,
            _id: taskId,
            _source: {
              '@timestamp': '2026-11-02T11:00:00.000Z',
              event: { outcome },
              ...(outcome === 'failure' ? { error: { message: 'Boom' } } : {}),
              kibana: { task: { id: taskId, type: 'actions:.index' } },
            },
          })),
        },
      });
    const createExistingTasksResponse = (taskIds: string[]) =>
      createSearchResponse({
        hits: { hits: taskIds.map((taskId) => ({ _index: TASK_INDEX, _id: `task:${taskId}` })) },
      });
    const failedRun = {
      at: '2026-11-02T11:00:00.000Z',
      outcome: 'failure',
      error_message: 'Boom',
    };

    it('lists removed tasks that failed in the window after the stored tasks, with their last run and failure', async () => {
      const { esClient, getHandler } = setup({ eventLogIndexPattern: EVENT_LOG_INDEX });
      esClient.search
        .mockResolvedValueOnce(createStoredTasksResponse(1, ['kept']))
        .mockResolvedValueOnce(
          createRunsResponse([
            { taskId: 'kept', outcome: 'failure' },
            { taskId: 'removed', outcome: 'failure' },
          ])
        )
        .mockResolvedValueOnce(createExistingTasksResponse(['kept']))
        .mockResolvedValueOnce(
          createRunsResponse([
            { taskId: 'kept', outcome: 'success' },
            { taskId: 'removed', outcome: 'failure' },
          ])
        )
        .mockResolvedValueOnce(createRunsResponse([{ taskId: 'kept', outcome: 'failure' }]));
      const [context, req, res] = mockHandlerArguments(
        {},
        { query: { ...tasksQuery, task_type: 'actions:.index' } },
        ['ok']
      );

      await getHandler('/internal/task_manager/ui/tasks')(context, req, res);

      expect(esClient.search.mock.calls[1][0]).toMatchObject({
        index: EVENT_LOG_INDEX,
        query: {
          bool: {
            filter: expect.arrayContaining([
              IN_RUNS_WINDOW,
              { term: { 'kibana.task.type': 'actions:.index' } },
            ]),
          },
        },
      });
      expect(esClient.search.mock.calls[2][0]).toMatchObject({ index: TASK_INDEX, _source: false });
      expect(esClient.search.mock.calls[3][0]).toMatchObject({
        query: {
          bool: {
            filter: expect.arrayContaining([{ terms: { 'kibana.task.id': ['kept', 'removed'] } }]),
          },
        },
      });
      expect(esClient.search.mock.calls[4][0]).toMatchObject({
        query: {
          bool: {
            filter: expect.arrayContaining([
              { term: { 'event.outcome': 'failure' } },
              IN_RUNS_WINDOW,
              { terms: { 'kibana.task.id': ['kept'] } },
            ]),
          },
        },
      });
      expect(res.ok).toHaveBeenCalledWith({
        body: {
          page: 1,
          per_page: 20,
          total: 2,
          tasks: [
            expect.objectContaining({
              id: 'kept',
              removed: false,
              last_run: { at: '2026-11-02T11:00:00.000Z', outcome: 'success' },
              last_failure: failedRun,
            }),
            {
              id: 'removed',
              task_type: 'actions:.index',
              removed: true,
              last_run: failedRun,
              last_failure: failedRun,
            },
          ],
        },
      });
    });

    it('fills a page with removed tasks once the stored tasks run out', async () => {
      const { esClient, getHandler } = setup({ eventLogIndexPattern: EVENT_LOG_INDEX });
      const removedTaskIds = ['removed-1', 'removed-2', 'removed-3'];
      esClient.search
        .mockResolvedValueOnce(createStoredTasksResponse(3, []))
        .mockResolvedValueOnce(
          createRunsResponse(removedTaskIds.map((taskId) => ({ taskId, outcome: 'failure' })))
        )
        .mockResolvedValueOnce(createExistingTasksResponse([]))
        .mockResolvedValueOnce(createRunsResponse([]));
      const [context, req, res] = mockHandlerArguments(
        {},
        { query: { ...tasksQuery, page: 3, per_page: 2 } },
        ['ok']
      );

      await getHandler('/internal/task_manager/ui/tasks')(context, req, res);

      expect(esClient.search).toHaveBeenCalledTimes(4);
      expect(res.ok).toHaveBeenCalledWith({
        body: expect.objectContaining({
          total: 6,
          tasks: [
            expect.objectContaining({ id: 'removed-2', removed: true }),
            expect.objectContaining({ id: 'removed-3', removed: true }),
          ],
        }),
      });
    });

    it('lists stored and removed tasks that failed in the window for the failed in window filter', async () => {
      const { esClient, getHandler } = setup({ eventLogIndexPattern: EVENT_LOG_INDEX });
      esClient.search
        .mockResolvedValueOnce(
          createRunsResponse([
            { taskId: 'removed', outcome: 'failure' },
            { taskId: 'kept', outcome: 'failure' },
          ])
        )
        .mockResolvedValueOnce(createStoredTasksResponse(1, ['kept']))
        .mockResolvedValueOnce(
          createRunsResponse([
            { taskId: 'removed', outcome: 'failure' },
            { taskId: 'kept', outcome: 'success' },
          ])
        );
      const [context, req, res] = mockHandlerArguments(
        {},
        { query: { ...tasksQuery, status: 'failed_in_window', task_type: 'actions:.index' } },
        ['ok']
      );

      await getHandler('/internal/task_manager/ui/tasks')(context, req, res);

      expect(esClient.search).toHaveBeenCalledTimes(3);
      expect(esClient.search.mock.calls[0][0]).toMatchObject({
        index: EVENT_LOG_INDEX,
        query: {
          bool: {
            filter: expect.arrayContaining([
              IN_RUNS_WINDOW,
              { term: { 'kibana.task.type': 'actions:.index' } },
            ]),
          },
        },
      });
      expect(esClient.search.mock.calls[1][0]).toMatchObject({
        index: TASK_INDEX,
        query: {
          bool: {
            filter: [
              { term: { type: 'task' } },
              { ids: { values: ['task:removed', 'task:kept'] } },
            ],
          },
        },
      });
      expect(res.ok).toHaveBeenCalledWith({
        body: {
          page: 1,
          per_page: 20,
          total: 2,
          tasks: [
            {
              id: 'removed',
              task_type: 'actions:.index',
              removed: true,
              last_run: failedRun,
              last_failure: failedRun,
            },
            expect.objectContaining({
              id: 'kept',
              removed: false,
              status: 'idle',
              last_run: { at: '2026-11-02T11:00:00.000Z', outcome: 'success' },
              last_failure: failedRun,
            }),
          ],
        },
      });
    });

    it('lists only the stored overdue tasks that failed in the window when overdue is set', async () => {
      const { esClient, getHandler } = setup({ eventLogIndexPattern: EVENT_LOG_INDEX });
      esClient.search
        .mockResolvedValueOnce(
          createRunsResponse([
            { taskId: 'removed', outcome: 'failure' },
            { taskId: 'kept', outcome: 'failure' },
          ])
        )
        .mockResolvedValueOnce(createStoredTasksResponse(1, ['kept']))
        .mockResolvedValueOnce(createRunsResponse([{ taskId: 'kept', outcome: 'failure' }]));
      const [context, req, res] = mockHandlerArguments(
        {},
        { query: { ...tasksQuery, status: 'failed_in_window', overdue: true } },
        ['ok']
      );

      await getHandler('/internal/task_manager/ui/tasks')(context, req, res);

      expect(esClient.search.mock.calls[1][0]).toMatchObject({
        query: {
          bool: {
            filter: expect.arrayContaining([
              {
                bool: {
                  filter: expect.arrayContaining([{ term: { 'task.status': 'idle' } }]),
                },
              },
            ]),
          },
        },
      });
      expect(res.ok).toHaveBeenCalledWith({
        body: expect.objectContaining({
          total: 1,
          tasks: [expect.objectContaining({ id: 'kept', removed: false })],
        }),
      });
    });

    it('lists no tasks for the failed in window filter without the event log', async () => {
      const { esClient, getHandler } = setup();
      const [context, req, res] = mockHandlerArguments(
        {},
        { query: { ...tasksQuery, status: 'failed_in_window' } },
        ['ok']
      );

      await getHandler('/internal/task_manager/ui/tasks')(context, req, res);

      expect(esClient.search).not.toHaveBeenCalled();
      expect(res.ok).toHaveBeenCalledWith({
        body: { page: 1, per_page: 20, total: 0, tasks: [] },
      });
    });

    it('does not list removed tasks when filtering by a stored status', async () => {
      const { esClient, getHandler } = setup({ eventLogIndexPattern: EVENT_LOG_INDEX });
      esClient.search
        .mockResolvedValueOnce(createStoredTasksResponse(1, ['kept']))
        .mockResolvedValueOnce(createRunsResponse([]))
        .mockResolvedValueOnce(createRunsResponse([]));
      const [context, req, res] = mockHandlerArguments(
        {},
        { query: { ...tasksQuery, status: 'idle' } },
        ['ok']
      );

      await getHandler('/internal/task_manager/ui/tasks')(context, req, res);

      expect(esClient.search).toHaveBeenCalledTimes(3);
      expect(res.ok).toHaveBeenCalledWith({
        body: expect.objectContaining({
          total: 1,
          tasks: [expect.objectContaining({ id: 'kept', removed: false })],
        }),
      });
      expect((res.ok as jest.Mock).mock.calls[0][0].body.tasks[0]).not.toHaveProperty(
        'last_failure'
      );
    });
  });
});
