/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type {
  TaskFailuresInWindow,
  TaskLastRun,
  TaskRun,
  TaskRunsSummary,
  TaskRunsWindow,
  TaskSummary,
  TaskTypeDefinitionSummary,
} from '../../../common';
import { EVENT_LOG_ACTIONS, EVENT_LOG_PROVIDER, EventLogOutcomes } from '../../constants';
import { TaskStatus } from '../../task';
import type { TaskDefinition } from '../../task';

export const MAX_TASK_TYPE_BUCKETS = 1000;
export const RECENT_RUNS_SIZE = 20;

const NANOS_PER_MILLI = 1_000_000;

export const TASK_LIST_SORT_FIELDS = {
  run_at: 'task.runAt',
  scheduled_at: 'task.scheduledAt',
  retry_at: 'task.retryAt',
  attempts: 'task.attempts',
  task_type: 'task.taskType',
  status: 'task.status',
} as const;

export type TaskListSortField = keyof typeof TASK_LIST_SORT_FIELDS;

const TASK_SUMMARY_SOURCE_FIELDS = [
  'task.taskType',
  'task.status',
  'task.enabled',
  'task.runAt',
  'task.scheduledAt',
  'task.startedAt',
  'task.retryAt',
  'task.attempts',
  'task.schedule',
  'task.ownerId',
  'task.partition',
  'task.priority',
];

const TASK_DETAIL_SOURCE_FIELDS = [
  ...TASK_SUMMARY_SOURCE_FIELDS,
  'task.scope',
  'task.timeoutOverride',
];

const ONLY_TASKS: estypes.QueryDslQueryContainer = { term: { type: 'task' } };

const OVERDUE_TASKS: estypes.QueryDslQueryContainer = {
  bool: {
    filter: [
      { term: { 'task.status': TaskStatus.Idle } },
      { term: { 'task.enabled': true } },
      { range: { 'task.runAt': { lt: 'now' } } },
    ],
  },
};

export interface RawTaskSource {
  task?: {
    taskType?: string;
    status?: string;
    enabled?: boolean;
    runAt?: string;
    scheduledAt?: string;
    startedAt?: string | null;
    retryAt?: string | null;
    attempts?: number;
    schedule?: TaskSummary['schedule'];
    ownerId?: string | null;
    partition?: number;
    priority?: number;
    scope?: string[];
    timeoutOverride?: string;
  };
}

export interface RawTaskRunSource {
  '@timestamp'?: string;
  message?: string;
  event?: { outcome?: string; duration?: number | string };
  error?: { message?: string };
  kibana?: {
    server_uuid?: string;
    task?: {
      id?: string;
      type?: string;
      schedule_delay?: number | string;
      execution?: { uuid?: string };
    };
  };
}

const TASK_ID_PREFIX = 'task:';

const toTaskId = (docId: string): string =>
  docId.startsWith(TASK_ID_PREFIX) ? docId.slice(TASK_ID_PREFIX.length) : docId;

const nanosToMillis = (nanos: number | string | undefined): number | undefined => {
  if (nanos === undefined || nanos === null) {
    return undefined;
  }
  const value = Number(nanos);
  return Number.isFinite(value) ? value / NANOS_PER_MILLI : undefined;
};

export const toTaskSummary = (
  hit: estypes.SearchHit<RawTaskSource>
): TaskSummary & { scope?: string[]; timeout_override?: string } => {
  const task = hit._source?.task ?? {};
  return {
    id: toTaskId(hit._id ?? ''),
    task_type: task.taskType ?? '',
    status: task.status ?? '',
    enabled: task.enabled === true,
    run_at: task.runAt,
    scheduled_at: task.scheduledAt,
    started_at: task.startedAt,
    retry_at: task.retryAt,
    attempts: task.attempts ?? 0,
    schedule: task.schedule,
    owner_id: task.ownerId,
    partition: task.partition,
    priority: task.priority,
    ...(task.scope ? { scope: task.scope } : {}),
    ...(task.timeoutOverride ? { timeout_override: task.timeoutOverride } : {}),
  };
};

export const toTaskTypeDefinitionSummary = (
  definition: TaskDefinition,
  defaultMaxAttempts: number
): TaskTypeDefinitionSummary => ({
  title: definition.title,
  description: definition.description,
  timeout: definition.timeout,
  max_attempts: definition.maxAttempts ?? defaultMaxAttempts,
  max_concurrency: definition.maxConcurrency,
  cost: definition.cost,
  priority: definition.priority,
  task_type_group: definition.taskTypeGroup,
});

export const buildTaskOverviewRequest = (index: string): estypes.SearchRequest => ({
  index,
  ignore_unavailable: true,
  size: 0,
  track_total_hits: true,
  query: ONLY_TASKS,
  aggs: {
    status: { terms: { field: 'task.status', size: 20 } },
    overdue: { filter: OVERDUE_TASKS },
    taskType: {
      terms: { field: 'task.taskType', size: MAX_TASK_TYPE_BUCKETS },
      aggs: {
        status: { terms: { field: 'task.status', size: 20 } },
        overdue: { filter: OVERDUE_TASKS },
      },
    },
  },
});

interface TermsBucket {
  key: string;
  doc_count: number;
}

interface TaskTypeBucket extends TermsBucket {
  status: { buckets: TermsBucket[] };
  overdue: { doc_count: number };
}

interface TaskOverviewAggregations {
  status?: { buckets: TermsBucket[] };
  overdue?: { doc_count: number };
  taskType?: { buckets: TaskTypeBucket[] };
}

const toCountRecord = (buckets: TermsBucket[] = []): Record<string, number> =>
  Object.fromEntries(buckets.map(({ key, doc_count: count }) => [key, count]));

const getTotal = (total: estypes.SearchTotalHits | number | undefined): number =>
  typeof total === 'number' ? total : total?.value ?? 0;

export interface ParsedTaskOverview {
  tasks: number;
  overdue: number;
  byStatus: Record<string, number>;
  byTaskType: Map<string, { tasks: number; overdue: number; byStatus: Record<string, number> }>;
}

export const parseTaskOverview = (response: estypes.SearchResponse): ParsedTaskOverview => {
  const aggregations = response.aggregations as TaskOverviewAggregations | undefined;
  return {
    tasks: getTotal(response.hits.total),
    overdue: aggregations?.overdue?.doc_count ?? 0,
    byStatus: toCountRecord(aggregations?.status?.buckets),
    byTaskType: new Map(
      (aggregations?.taskType?.buckets ?? []).map((bucket) => [
        bucket.key,
        {
          tasks: bucket.doc_count,
          overdue: bucket.overdue.doc_count,
          byStatus: toCountRecord(bucket.status.buckets),
        },
      ])
    ),
  };
};

const TASK_RUN_EVENTS: estypes.QueryDslQueryContainer[] = [
  { term: { 'event.provider': EVENT_LOG_PROVIDER } },
  { term: { 'event.action': EVENT_LOG_ACTIONS.taskRun } },
];

const inWindow = ({ start, end }: TaskRunsWindow): estypes.QueryDslQueryContainer => ({
  range: { '@timestamp': { gte: start, lte: end } },
});

export const buildTaskRunsSummaryRequest = (
  index: string,
  window: TaskRunsWindow
): estypes.SearchRequest => ({
  index,
  ignore_unavailable: true,
  size: 0,
  query: {
    bool: {
      filter: [...TASK_RUN_EVENTS, inWindow(window)],
    },
  },
  aggs: {
    taskType: {
      terms: { field: 'kibana.task.type', size: MAX_TASK_TYPE_BUCKETS },
      aggs: {
        outcome: { terms: { field: 'event.outcome', size: 5 } },
        avgDuration: { avg: { field: 'event.duration' } },
        durationPercentiles: { percentiles: { field: 'event.duration', percents: [95] } },
        failures: {
          filter: { term: { 'event.outcome': 'failure' } },
          aggs: {
            tasks: { cardinality: { field: 'kibana.task.id' } },
            latest: {
              top_hits: {
                size: 1,
                sort: [{ '@timestamp': { order: 'desc' } }],
                _source: ['@timestamp', 'error.message', 'kibana.task.id'],
              },
            },
          },
        },
      },
    },
  },
});

interface TaskRunsTypeBucket extends TermsBucket {
  outcome: { buckets: TermsBucket[] };
  avgDuration: { value: number | null };
  durationPercentiles: { values: Record<string, number | null> };
  failures: {
    doc_count: number;
    tasks: { value: number };
    latest: { hits: { hits: Array<estypes.SearchHit<RawTaskRunSource>> } };
  };
}

export const parseTaskRunsSummary = (
  response: estypes.SearchResponse
): Map<string, TaskRunsSummary> => {
  const aggregations = response.aggregations as
    | { taskType?: { buckets: TaskRunsTypeBucket[] } }
    | undefined;

  return new Map(
    (aggregations?.taskType?.buckets ?? []).map((bucket) => {
      const outcomes = toCountRecord(bucket.outcome.buckets);
      const latestFailure = bucket.failures.latest.hits.hits[0]?._source;
      const p95 = Object.values(bucket.durationPercentiles.values)[0];
      const summary: TaskRunsSummary = {
        success: outcomes.success ?? 0,
        failure: outcomes.failure ?? 0,
        failed_tasks: bucket.failures.tasks.value,
        avg_duration_ms: nanosToMillis(bucket.avgDuration.value ?? undefined),
        p95_duration_ms: nanosToMillis(p95 ?? undefined),
        ...(latestFailure?.['@timestamp']
          ? {
              last_failure: {
                at: latestFailure['@timestamp'],
                task_id: latestFailure.kibana?.task?.id,
                message: latestFailure.error?.message,
              },
            }
          : {}),
      };
      return [bucket.key, summary];
    })
  );
};

export interface TaskListQuery {
  taskType?: string;
  status?: string;
  overdue?: boolean;
  taskId?: string;
  page: number;
  perPage: number;
  sortField: TaskListSortField;
  sortOrder: 'asc' | 'desc';
}

export const buildTaskListRequest = (
  index: string,
  { taskType, status, overdue, taskId, page, perPage, sortField, sortOrder }: TaskListQuery
): estypes.SearchRequest => {
  const filter: estypes.QueryDslQueryContainer[] = [ONLY_TASKS];
  if (taskType) {
    filter.push({ term: { 'task.taskType': taskType } });
  }
  if (status) {
    filter.push({ term: { 'task.status': status } });
  }
  if (overdue) {
    filter.push(OVERDUE_TASKS);
  }
  if (taskId) {
    filter.push({ ids: { values: [`${TASK_ID_PREFIX}${taskId}`] } });
  }

  return {
    index,
    ignore_unavailable: true,
    track_total_hits: true,
    from: (page - 1) * perPage,
    size: perPage,
    _source: TASK_SUMMARY_SOURCE_FIELDS,
    query: { bool: { filter } },
    sort: [{ [TASK_LIST_SORT_FIELDS[sortField]]: { order: sortOrder } }],
  };
};

export const parseTaskList = (
  response: estypes.SearchResponse<RawTaskSource>
): { total: number; tasks: TaskSummary[] } => ({
  total: getTotal(response.hits.total),
  tasks: response.hits.hits.map(toTaskSummary),
});

export const buildTaskDetailRequest = (index: string, taskId: string): estypes.SearchRequest => ({
  index,
  ignore_unavailable: true,
  size: 1,
  _source: TASK_DETAIL_SOURCE_FIELDS,
  query: {
    bool: { filter: [ONLY_TASKS, { ids: { values: [`${TASK_ID_PREFIX}${taskId}`] } }] },
  },
});

export const buildRecentRunsRequest = (index: string, taskId: string): estypes.SearchRequest => ({
  index,
  ignore_unavailable: true,
  size: RECENT_RUNS_SIZE,
  sort: [{ '@timestamp': { order: 'desc' } }],
  _source: [
    '@timestamp',
    'message',
    'event.outcome',
    'event.duration',
    'error.message',
    'kibana.server_uuid',
    'kibana.task.type',
    'kibana.task.schedule_delay',
    'kibana.task.execution.uuid',
  ],
  query: {
    bool: { filter: [...TASK_RUN_EVENTS, { term: { 'kibana.task.id': taskId } }] },
  },
});

export const getRecentRunsTaskType = (
  response: estypes.SearchResponse<RawTaskRunSource>
): string | undefined => response.hits.hits[0]?._source?.kibana?.task?.type;

export const parseRecentRuns = (response: estypes.SearchResponse<RawTaskRunSource>): TaskRun[] =>
  response.hits.hits.flatMap(({ _source: source }) => {
    if (!source?.['@timestamp']) {
      return [];
    }
    return [
      {
        timestamp: source['@timestamp'],
        outcome: source.event?.outcome,
        duration_ms: nanosToMillis(source.event?.duration),
        schedule_delay_ms: nanosToMillis(source.kibana?.task?.schedule_delay),
        message: source.message,
        error_message: source.error?.message,
        node_id: source.kibana?.server_uuid,
        execution_uuid: source.kibana?.task?.execution?.uuid,
      },
    ];
  });

/** Caps how many tasks that failed in the window are listed, or checked for removal, on each task list request. */
export const MAX_FAILED_TASKS = 500;

const buildLatestRunPerTaskRequest = (
  index: string,
  filter: estypes.QueryDslQueryContainer[],
  size: number
): estypes.SearchRequest => ({
  index,
  ignore_unavailable: true,
  track_total_hits: false,
  size,
  sort: [{ '@timestamp': { order: 'desc' } }],
  _source: ['@timestamp', 'event.outcome', 'error.message', 'kibana.task.id', 'kibana.task.type'],
  query: { bool: { filter: [...TASK_RUN_EVENTS, ...filter] } },
  collapse: { field: 'kibana.task.id' },
});

const failedInWindow = (window: TaskRunsWindow): estypes.QueryDslQueryContainer[] => [
  { term: { 'event.outcome': EventLogOutcomes.failure } },
  inWindow(window),
];

export interface FailedTasksQuery {
  window: TaskRunsWindow;
  taskType?: string;
  taskId?: string;
}

/** The latest failed run of each task that failed in the window, newest first, including removed tasks. */
export const buildFailedTasksRequest = (
  index: string,
  { window, taskType, taskId }: FailedTasksQuery
): estypes.SearchRequest =>
  buildLatestRunPerTaskRequest(
    index,
    [
      ...failedInWindow(window),
      ...(taskType ? [{ term: { 'kibana.task.type': taskType } }] : []),
      ...(taskId ? [{ term: { 'kibana.task.id': taskId } }] : []),
    ],
    MAX_FAILED_TASKS
  );

export const buildLastRunsRequest = (index: string, taskIds: string[]): estypes.SearchRequest =>
  buildLatestRunPerTaskRequest(index, [{ terms: { 'kibana.task.id': taskIds } }], taskIds.length);

export const buildLastFailuresRequest = (
  index: string,
  window: TaskRunsWindow,
  taskIds: string[]
): estypes.SearchRequest =>
  buildLatestRunPerTaskRequest(
    index,
    [...failedInWindow(window), { terms: { 'kibana.task.id': taskIds } }],
    taskIds.length
  );

/** Counts the failed runs of a task in the window and returns the latest one. */
export const buildTaskFailuresRequest = (
  index: string,
  taskId: string,
  window: TaskRunsWindow
): estypes.SearchRequest => ({
  index,
  ignore_unavailable: true,
  track_total_hits: true,
  size: 1,
  sort: [{ '@timestamp': { order: 'desc' } }],
  _source: ['@timestamp', 'event.outcome', 'error.message', 'kibana.task.id', 'kibana.task.type'],
  query: {
    bool: {
      filter: [
        ...TASK_RUN_EVENTS,
        ...failedInWindow(window),
        { term: { 'kibana.task.id': taskId } },
      ],
    },
  },
});

export interface LatestTaskRun {
  taskId: string;
  taskType: string;
  run: TaskLastRun;
}

export const parseLatestRuns = (
  response: estypes.SearchResponse<RawTaskRunSource>
): LatestTaskRun[] =>
  response.hits.hits.flatMap(({ _source: source }) => {
    const taskId = source?.kibana?.task?.id;
    const at = source?.['@timestamp'];
    if (!taskId || !at) {
      return [];
    }
    const errorMessage = source.error?.message;
    return [
      {
        taskId,
        taskType: source.kibana?.task?.type ?? '',
        run: {
          at,
          outcome: source.event?.outcome,
          ...(errorMessage ? { error_message: errorMessage } : {}),
        },
      },
    ];
  });

export const parseTaskFailures = (
  response: estypes.SearchResponse<RawTaskRunSource>,
  window: TaskRunsWindow
): TaskFailuresInWindow | undefined => {
  const [latestFailure] = parseLatestRuns(response);
  return latestFailure
    ? { window, count: getTotal(response.hits.total), last_failure: latestFailure.run }
    : undefined;
};

export const buildTasksByIdRequest = (
  index: string,
  taskIds: string[],
  { overdue }: { overdue: boolean }
): estypes.SearchRequest => ({
  index,
  ignore_unavailable: true,
  size: taskIds.length,
  _source: TASK_SUMMARY_SOURCE_FIELDS,
  query: {
    bool: {
      filter: [
        ONLY_TASKS,
        { ids: { values: taskIds.map((id) => `${TASK_ID_PREFIX}${id}`) } },
        ...(overdue ? [OVERDUE_TASKS] : []),
      ],
    },
  },
});

export const buildExistingTasksRequest = (
  index: string,
  taskIds: string[]
): estypes.SearchRequest => ({
  index,
  ignore_unavailable: true,
  size: taskIds.length,
  _source: false,
  query: {
    bool: {
      filter: [ONLY_TASKS, { ids: { values: taskIds.map((id) => `${TASK_ID_PREFIX}${id}`) } }],
    },
  },
});

export const parseExistingTaskIds = (response: estypes.SearchResponse): Set<string> =>
  new Set(response.hits.hits.map(({ _id: docId }) => toTaskId(docId ?? '')));
