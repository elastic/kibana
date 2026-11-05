/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import {
  buildExistingTasksRequest,
  buildFailedTasksRequest,
  buildLastFailuresRequest,
  buildLastRunsRequest,
  buildRecentRunsRequest,
  buildTaskDetailRequest,
  buildTaskFailuresRequest,
  buildTaskListRequest,
  buildTaskRunsSummaryRequest,
  buildTasksByIdRequest,
  getRecentRunsTaskType,
  parseExistingTaskIds,
  parseLatestRuns,
  parseRecentRuns,
  parseTaskFailures,
  parseTaskList,
  parseTaskOverview,
  parseTaskRunsSummary,
  toTaskTypeDefinitionSummary,
} from './queries';
import type { RawTaskRunSource, RawTaskSource } from './queries';
import { TaskTypeGroup } from '../../task';

const TASK_INDEX = '.kibana_task_manager';
const EVENT_LOG_INDEX = '.kibana-event-log-*';

const SENSITIVE_FIELDS = ['task.params', 'task.state', 'task.apiKey', 'task.uiamApiKey'];

const RUNS_WINDOW = { start: '2026-11-03T12:00:00.000Z', end: '2026-11-04T12:00:00.000Z' };
const IN_RUNS_WINDOW = {
  range: { '@timestamp': { gte: '2026-11-03T12:00:00.000Z', lte: '2026-11-04T12:00:00.000Z' } },
};

const createSearchResponse = <TSource = unknown>(
  overrides: Partial<estypes.SearchResponse<TSource>> = {}
): estypes.SearchResponse<TSource> => ({
  took: 1,
  timed_out: false,
  _shards: { total: 1, successful: 1, failed: 0 },
  hits: { total: { value: 0, relation: 'eq' }, hits: [] },
  ...overrides,
});

describe('Task Manager UI queries', () => {
  describe('toTaskTypeDefinitionSummary', () => {
    it('includes the task type group and falls back to the default max attempts', () => {
      expect(
        toTaskTypeDefinitionSummary(
          {
            type: 'ad_hoc_run-backfill',
            title: 'Backfill',
            timeout: '5m',
            cost: 2,
            taskTypeGroup: TaskTypeGroup.Alerting,
            createTaskRunner: jest.fn(),
          },
          3
        )
      ).toEqual({
        title: 'Backfill',
        description: undefined,
        timeout: '5m',
        max_attempts: 3,
        max_concurrency: undefined,
        cost: 2,
        priority: undefined,
        task_type_group: 'alerting',
      });
    });
  });

  describe('buildTaskListRequest', () => {
    it('only requests non-sensitive fields and paginates', () => {
      const request = buildTaskListRequest(TASK_INDEX, {
        page: 3,
        perPage: 20,
        sortField: 'run_at',
        sortOrder: 'asc',
      });

      expect(request).toMatchObject({
        index: TASK_INDEX,
        from: 40,
        size: 20,
        track_total_hits: true,
        sort: [{ 'task.runAt': { order: 'asc' } }],
        query: { bool: { filter: [{ term: { type: 'task' } }] } },
      });
      for (const field of SENSITIVE_FIELDS) {
        expect(request._source).not.toContain(field);
      }
    });

    it('applies every filter', () => {
      const request = buildTaskListRequest(TASK_INDEX, {
        taskType: 'report:execute',
        status: 'idle',
        overdue: true,
        taskId: 'abc',
        page: 1,
        perPage: 10,
        sortField: 'attempts',
        sortOrder: 'desc',
      });

      expect(request.query).toEqual({
        bool: {
          filter: [
            { term: { type: 'task' } },
            { term: { 'task.taskType': 'report:execute' } },
            { term: { 'task.status': 'idle' } },
            {
              bool: {
                filter: [
                  { term: { 'task.status': 'idle' } },
                  { term: { 'task.enabled': true } },
                  { range: { 'task.runAt': { lt: 'now' } } },
                ],
              },
            },
            { ids: { values: ['task:abc'] } },
          ],
        },
      });
      expect(request.sort).toEqual([{ 'task.attempts': { order: 'desc' } }]);
    });
  });

  describe('buildTaskDetailRequest', () => {
    it('looks the task up by document id without sensitive fields', () => {
      const request = buildTaskDetailRequest(TASK_INDEX, 'abc');

      expect(request.query).toEqual({
        bool: { filter: [{ term: { type: 'task' } }, { ids: { values: ['task:abc'] } }] },
      });
      for (const field of SENSITIVE_FIELDS) {
        expect(request._source).not.toContain(field);
      }
    });
  });

  describe('parseTaskList', () => {
    it('maps raw task documents to summaries', () => {
      const response = createSearchResponse<RawTaskSource>({
        hits: {
          total: { value: 1, relation: 'eq' },
          hits: [
            {
              _index: TASK_INDEX,
              _id: 'task:abc',
              _source: {
                task: {
                  taskType: 'report:execute',
                  status: 'running',
                  runAt: '2026-11-02T12:00:00.000Z',
                  attempts: 1,
                  ownerId: 'kibana:node-1',
                  schedule: { interval: '1m' },
                },
              },
            },
          ],
        },
      });

      expect(parseTaskList(response)).toEqual({
        total: 1,
        tasks: [
          {
            id: 'abc',
            task_type: 'report:execute',
            status: 'running',
            enabled: false,
            run_at: '2026-11-02T12:00:00.000Z',
            attempts: 1,
            owner_id: 'kibana:node-1',
            schedule: { interval: '1m' },
          },
        ],
      });
    });
  });

  describe('parseTaskOverview', () => {
    it('reads totals and per task type counts', () => {
      const response = createSearchResponse({
        hits: { total: { value: 12, relation: 'eq' }, hits: [] },
        aggregations: {
          status: {
            buckets: [
              { key: 'idle', doc_count: 10 },
              { key: 'failed', doc_count: 2 },
            ],
          },
          overdue: { doc_count: 4 },
          taskType: {
            buckets: [
              {
                key: 'report:execute',
                doc_count: 12,
                status: { buckets: [{ key: 'idle', doc_count: 12 }] },
                overdue: { doc_count: 4 },
              },
            ],
          },
        } as Record<string, estypes.AggregationsAggregate>,
      });

      const overview = parseTaskOverview(response);

      expect(overview.tasks).toBe(12);
      expect(overview.overdue).toBe(4);
      expect(overview.byStatus).toEqual({ idle: 10, failed: 2 });
      expect(overview.byTaskType.get('report:execute')).toEqual({
        tasks: 12,
        overdue: 4,
        byStatus: { idle: 12 },
      });
    });
  });

  describe('buildTaskRunsSummaryRequest', () => {
    it('scopes the aggregation to task-run events in the window', () => {
      const request = buildTaskRunsSummaryRequest(EVENT_LOG_INDEX, RUNS_WINDOW);

      expect(request.index).toBe(EVENT_LOG_INDEX);
      expect(request.query).toEqual({
        bool: {
          filter: [
            { term: { 'event.provider': 'taskManager' } },
            { term: { 'event.action': 'task-run' } },
            IN_RUNS_WINDOW,
          ],
        },
      });
    });

    it('counts distinct failed tasks so removed one-time tasks are included', () => {
      const request = buildTaskRunsSummaryRequest(EVENT_LOG_INDEX, RUNS_WINDOW);

      expect(request.aggs?.taskType.aggs?.failures).toMatchObject({
        filter: { term: { 'event.outcome': 'failure' } },
        aggs: { tasks: { cardinality: { field: 'kibana.task.id' } } },
      });
    });
  });

  describe('parseTaskRunsSummary', () => {
    it('converts durations to milliseconds and reads the last failure', () => {
      const response = createSearchResponse({
        aggregations: {
          taskType: {
            buckets: [
              {
                key: 'report:execute',
                doc_count: 5,
                outcome: {
                  buckets: [
                    { key: 'success', doc_count: 4 },
                    { key: 'failure', doc_count: 1 },
                  ],
                },
                avgDuration: { value: 2_000_000 },
                durationPercentiles: { values: { '95.0': 9_000_000 } },
                failures: {
                  doc_count: 1,
                  tasks: { value: 1 },
                  latest: {
                    hits: {
                      hits: [
                        {
                          _index: EVENT_LOG_INDEX,
                          _id: '1',
                          _source: {
                            '@timestamp': '2026-11-02T11:00:00.000Z',
                            error: { message: 'boom' },
                            kibana: { task: { id: 'abc' } },
                          },
                        },
                      ],
                    },
                  },
                },
              },
            ],
          },
        } as Record<string, estypes.AggregationsAggregate>,
      });

      expect(parseTaskRunsSummary(response).get('report:execute')).toEqual({
        success: 4,
        failure: 1,
        failed_tasks: 1,
        avg_duration_ms: 2,
        p95_duration_ms: 9,
        last_failure: { at: '2026-11-02T11:00:00.000Z', task_id: 'abc', message: 'boom' },
      });
    });
  });

  describe('recent runs', () => {
    it('queries the latest task-run events for a task', () => {
      const request = buildRecentRunsRequest(EVENT_LOG_INDEX, 'abc');

      expect(request).toMatchObject({
        index: EVENT_LOG_INDEX,
        size: 20,
        sort: [{ '@timestamp': { order: 'desc' } }],
        query: {
          bool: {
            filter: [
              { term: { 'event.provider': 'taskManager' } },
              { term: { 'event.action': 'task-run' } },
              { term: { 'kibana.task.id': 'abc' } },
            ],
          },
        },
      });
    });

    it('maps events to runs and skips events without a timestamp', () => {
      const response = createSearchResponse<RawTaskRunSource>({
        hits: {
          hits: [
            {
              _index: EVENT_LOG_INDEX,
              _id: '1',
              _source: {
                '@timestamp': '2026-11-02T11:00:00.000Z',
                message: 'Task failed',
                event: { outcome: 'failure', duration: '1500000' },
                error: { message: 'boom' },
                kibana: {
                  server_uuid: 'node-1',
                  task: { schedule_delay: 3_000_000, execution: { uuid: 'exec-1' } },
                },
              },
            },
            { _index: EVENT_LOG_INDEX, _id: '2', _source: {} },
          ],
        },
      });

      expect(parseRecentRuns(response)).toEqual([
        {
          timestamp: '2026-11-02T11:00:00.000Z',
          outcome: 'failure',
          duration_ms: 1.5,
          schedule_delay_ms: 3,
          message: 'Task failed',
          error_message: 'boom',
          node_id: 'node-1',
          execution_uuid: 'exec-1',
        },
      ]);
    });

    it('reads the task type from the latest run', () => {
      const response = createSearchResponse<RawTaskRunSource>({
        hits: {
          hits: [
            {
              _index: EVENT_LOG_INDEX,
              _id: '1',
              _source: { kibana: { task: { type: 'actions:.index' } } },
            },
          ],
        },
      });

      expect(getRecentRunsTaskType(response)).toBe('actions:.index');
      expect(getRecentRunsTaskType(createSearchResponse<RawTaskRunSource>())).toBeUndefined();
    });
  });

  describe('latest runs per task', () => {
    it('finds the latest failed run of each task that failed in the window', () => {
      const request = buildFailedTasksRequest(EVENT_LOG_INDEX, {
        window: RUNS_WINDOW,
        taskType: 'actions:.index',
        taskId: 'abc',
      });

      expect(request).toMatchObject({
        index: EVENT_LOG_INDEX,
        size: 500,
        sort: [{ '@timestamp': { order: 'desc' } }],
        query: {
          bool: {
            filter: [
              { term: { 'event.provider': 'taskManager' } },
              { term: { 'event.action': 'task-run' } },
              { term: { 'event.outcome': 'failure' } },
              IN_RUNS_WINDOW,
              { term: { 'kibana.task.type': 'actions:.index' } },
              { term: { 'kibana.task.id': 'abc' } },
            ],
          },
        },
        collapse: { field: 'kibana.task.id' },
      });
    });

    it('omits the task type and id filters when they are not set', () => {
      const request = buildFailedTasksRequest(EVENT_LOG_INDEX, { window: RUNS_WINDOW });

      expect(JSON.stringify(request.query)).not.toContain('kibana.task.type');
      expect(JSON.stringify(request.query)).not.toContain('kibana.task.id');
    });

    it('finds the latest run of each listed task', () => {
      expect(buildLastRunsRequest(EVENT_LOG_INDEX, ['abc', 'def'])).toMatchObject({
        size: 2,
        query: {
          bool: {
            filter: [
              { term: { 'event.provider': 'taskManager' } },
              { term: { 'event.action': 'task-run' } },
              { terms: { 'kibana.task.id': ['abc', 'def'] } },
            ],
          },
        },
        collapse: { field: 'kibana.task.id' },
      });
    });

    it('maps the latest run of each task and skips incomplete events', () => {
      const response = createSearchResponse<RawTaskRunSource>({
        hits: {
          hits: [
            {
              _index: EVENT_LOG_INDEX,
              _id: '1',
              _source: {
                '@timestamp': '2026-11-02T11:02:00.000Z',
                event: { outcome: 'failure' },
                error: { message: 'error indexing documents' },
                kibana: { task: { id: 'abc', type: 'actions:.index' } },
              },
            },
            {
              _index: EVENT_LOG_INDEX,
              _id: '2',
              _source: {
                '@timestamp': '2026-11-02T11:01:00.000Z',
                event: { outcome: 'success' },
                kibana: { task: { id: 'def', type: 'report:execute' } },
              },
            },
            { _index: EVENT_LOG_INDEX, _id: '3', _source: {} },
          ],
        },
      });

      expect(parseLatestRuns(response)).toEqual([
        {
          taskId: 'abc',
          taskType: 'actions:.index',
          run: {
            at: '2026-11-02T11:02:00.000Z',
            outcome: 'failure',
            error_message: 'error indexing documents',
          },
        },
        {
          taskId: 'def',
          taskType: 'report:execute',
          run: { at: '2026-11-02T11:01:00.000Z', outcome: 'success' },
        },
      ]);
    });

    it('looks up which failed tasks still exist without reading their source', () => {
      const request = buildExistingTasksRequest(TASK_INDEX, ['abc', 'def']);

      expect(request).toMatchObject({
        index: TASK_INDEX,
        size: 2,
        _source: false,
        query: {
          bool: {
            filter: [{ term: { type: 'task' } }, { ids: { values: ['task:abc', 'task:def'] } }],
          },
        },
      });
      expect(
        parseExistingTaskIds(
          createSearchResponse({ hits: { hits: [{ _index: TASK_INDEX, _id: 'task:abc' }] } })
        )
      ).toEqual(new Set(['abc']));
    });

    it('finds the latest failed run in the window of each listed task', () => {
      expect(buildLastFailuresRequest(EVENT_LOG_INDEX, RUNS_WINDOW, ['abc', 'def'])).toMatchObject({
        size: 2,
        query: {
          bool: {
            filter: [
              { term: { 'event.provider': 'taskManager' } },
              { term: { 'event.action': 'task-run' } },
              { term: { 'event.outcome': 'failure' } },
              IN_RUNS_WINDOW,
              { terms: { 'kibana.task.id': ['abc', 'def'] } },
            ],
          },
        },
        collapse: { field: 'kibana.task.id' },
      });
    });

    it('reads the summary of listed tasks without sensitive fields, optionally only overdue ones', () => {
      const request = buildTasksByIdRequest(TASK_INDEX, ['abc', 'def'], { overdue: false });

      expect(request).toMatchObject({
        index: TASK_INDEX,
        size: 2,
        query: {
          bool: {
            filter: [{ term: { type: 'task' } }, { ids: { values: ['task:abc', 'task:def'] } }],
          },
        },
      });
      expect(request._source).toEqual(expect.arrayContaining(['task.taskType', 'task.status']));
      for (const field of SENSITIVE_FIELDS) {
        expect(request._source).not.toContain(field);
      }
      expect(
        buildTasksByIdRequest(TASK_INDEX, ['abc'], { overdue: true }).query?.bool?.filter
      ).toEqual(
        expect.arrayContaining([
          {
            bool: {
              filter: [
                { term: { 'task.status': 'idle' } },
                { term: { 'task.enabled': true } },
                { range: { 'task.runAt': { lt: 'now' } } },
              ],
            },
          },
        ])
      );
    });
  });

  describe('task failures in the window', () => {
    it('counts the failed runs of a task in the window and reads the latest one', () => {
      expect(buildTaskFailuresRequest(EVENT_LOG_INDEX, 'abc', RUNS_WINDOW)).toMatchObject({
        index: EVENT_LOG_INDEX,
        track_total_hits: true,
        size: 1,
        sort: [{ '@timestamp': { order: 'desc' } }],
        query: {
          bool: {
            filter: [
              { term: { 'event.provider': 'taskManager' } },
              { term: { 'event.action': 'task-run' } },
              { term: { 'event.outcome': 'failure' } },
              IN_RUNS_WINDOW,
              { term: { 'kibana.task.id': 'abc' } },
            ],
          },
        },
      });
    });

    it('maps the failure count and the latest failure', () => {
      const response = createSearchResponse<RawTaskRunSource>({
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
                kibana: { task: { id: 'abc', type: 'cases-analytics' } },
              },
            },
          ],
        },
      });

      expect(parseTaskFailures(response, RUNS_WINDOW)).toEqual({
        window: RUNS_WINDOW,
        count: 2,
        last_failure: {
          at: '2026-10-31T13:26:34.000Z',
          outcome: 'failure',
          error_message: 'Request timed out',
        },
      });
    });

    it('returns nothing when the task did not fail in the window', () => {
      expect(
        parseTaskFailures(createSearchResponse<RawTaskRunSource>(), RUNS_WINDOW)
      ).toBeUndefined();
    });
  });
});
