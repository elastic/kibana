/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { schema, type TypeOf } from '@kbn/config-schema';
import type { ElasticsearchClient, IRouter } from '@kbn/core/server';
import { ApiPrivileges } from '@kbn/core-security-server';
import type {
  RemovedTaskListItem,
  StoredTaskListItem,
  TaskLastRun,
  TaskListItem,
  TaskManagerUiOverviewResponse,
  TaskManagerUiTaskDetailResponse,
  TaskManagerUiTaskListResponse,
  TaskRunsWindow,
  TaskSummary,
  TaskTypeSummary,
} from '../../../common';
import type { TaskManagerConfig } from '../../config';
import type { TaskExecutionControlService } from '../../execution_control';
import type { KibanaDiscoveryService } from '../../kibana_discovery_service';
import type { TaskTypeDictionary } from '../../task_type_dictionary';
import { explainRemovedTask, explainTask } from './explain_task';
import {
  buildExistingTasksRequest,
  buildFailedTasksRequest,
  buildLastFailuresRequest,
  buildLastRunsRequest,
  buildRecentRunsRequest,
  buildTaskDetailRequest,
  buildTaskFailuresRequest,
  buildTaskListRequest,
  buildTaskOverviewRequest,
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
  toTaskSummary,
  toTaskTypeDefinitionSummary,
} from './queries';
import type { FailedTasksQuery, LatestTaskRun, RawTaskRunSource, RawTaskSource } from './queries';
import { runsWindowFields, toRunsWindow, validateRunsWindow } from './runs_window';

export const TASK_MANAGER_UI_API_BASE_PATH = '/internal/task_manager/ui';

const MAX_RESULT_WINDOW = 10_000;

/** Task list status filter that lists the stored and removed tasks that failed in the window. */
const FAILED_IN_WINDOW_FILTER = 'failed_in_window';

export interface TaskManagerUiStartDependencies {
  esClient: ElasticsearchClient;
  executionControlService: TaskExecutionControlService;
  discoveryService: KibanaDiscoveryService;
}

export interface TaskManagerUiRouteParams {
  router: IRouter;
  config: TaskManagerConfig;
  taskManagerIndex: string;
  getStartDependencies: () => Promise<TaskManagerUiStartDependencies>;
  getDefinitions: () => TaskTypeDictionary;
  getEventLogIndexPattern: () => string | undefined;
}

const security = {
  authz: { requiredPrivileges: [ApiPrivileges.manage('taskManager')] },
};

const overviewQuerySchema = schema.object(runsWindowFields, { validate: validateRunsWindow });

const validateResultWindow = ({ page, per_page: perPage }: { page: number; per_page: number }) => {
  if (page * perPage > MAX_RESULT_WINDOW) {
    return `page * per_page must not exceed ${MAX_RESULT_WINDOW}`;
  }
};

const taskStatusSchema = schema.oneOf([
  schema.literal('idle'),
  schema.literal('claiming'),
  schema.literal('running'),
  schema.literal('failed'),
  schema.literal('should_delete'),
  schema.literal('unrecognized'),
  schema.literal('dead_letter'),
  schema.literal(FAILED_IN_WINDOW_FILTER),
]);

const taskListQuerySchema = schema.object(
  {
    ...runsWindowFields,
    task_type: schema.maybe(schema.string({ minLength: 1, maxLength: 256 })),
    status: schema.maybe(taskStatusSchema),
    overdue: schema.boolean({ defaultValue: false }),
    task_id: schema.maybe(schema.string({ minLength: 1, maxLength: 1024 })),
    page: schema.number({ min: 1, defaultValue: 1 }),
    per_page: schema.number({ min: 1, max: 100, defaultValue: 20 }),
    sort_field: schema.oneOf(
      [
        schema.literal('run_at'),
        schema.literal('scheduled_at'),
        schema.literal('retry_at'),
        schema.literal('attempts'),
        schema.literal('task_type'),
        schema.literal('status'),
      ],
      { defaultValue: 'run_at' }
    ),
    sort_order: schema.oneOf([schema.literal('asc'), schema.literal('desc')], {
      defaultValue: 'asc',
    }),
  },
  { validate: (query) => validateResultWindow(query) ?? validateRunsWindow(query) }
);

const taskDetailParamsSchema = schema.object({
  id: schema.string({ minLength: 1, maxLength: 1024 }),
});

const taskDetailQuerySchema = schema.object(runsWindowFields, { validate: validateRunsWindow });

type TaskListRequestQuery = Omit<TypeOf<typeof taskListQuerySchema>, 'start' | 'end'> & {
  window: TaskRunsWindow;
};

interface TaskListPage {
  total: number;
  tasks: TaskListItem[];
}

const EMPTY_TASK_LIST_PAGE: TaskListPage = { total: 0, tasks: [] };

const toStoredTaskListItem = (task: TaskSummary): StoredTaskListItem => ({
  ...task,
  removed: false,
});

const toRemovedTaskListItem = ({ taskId, taskType, run }: LatestTaskRun): RemovedTaskListItem => ({
  id: taskId,
  task_type: taskType,
  removed: true,
  last_run: run,
  last_failure: run,
});

const toFailedTasksQuery = ({
  window,
  task_type: taskType,
  task_id: taskId,
}: TaskListRequestQuery) => ({
  window,
  taskType,
  taskId,
});

const findLatestRuns = async (
  esClient: ElasticsearchClient,
  request: estypes.SearchRequest
): Promise<Map<string, TaskLastRun>> =>
  new Map(
    parseLatestRuns(await esClient.search<RawTaskRunSource>(request)).map(({ taskId, run }) => [
      taskId,
      run,
    ])
  );

const findFailedTasks = async (
  esClient: ElasticsearchClient,
  eventLogIndexPattern: string,
  query: FailedTasksQuery
): Promise<LatestTaskRun[]> =>
  parseLatestRuns(
    await esClient.search<RawTaskRunSource>(buildFailedTasksRequest(eventLogIndexPattern, query))
  );

const findRemovedFailedTasks = async (
  esClient: ElasticsearchClient,
  taskManagerIndex: string,
  eventLogIndexPattern: string,
  query: FailedTasksQuery
): Promise<RemovedTaskListItem[]> => {
  const failedTasks = await findFailedTasks(esClient, eventLogIndexPattern, query);
  if (failedTasks.length === 0) {
    return [];
  }
  const existingTaskIds = parseExistingTaskIds(
    await esClient.search(
      buildExistingTasksRequest(
        taskManagerIndex,
        failedTasks.map(({ taskId }) => taskId)
      )
    )
  );
  return failedTasks
    .filter(({ taskId }) => !existingTaskIds.has(taskId))
    .map(toRemovedTaskListItem);
};

const findStoredTasks = async (
  esClient: ElasticsearchClient,
  taskManagerIndex: string,
  taskIds: string[],
  { overdue }: { overdue: boolean }
): Promise<Map<string, TaskSummary>> => {
  if (taskIds.length === 0) {
    return new Map();
  }
  const { tasks } = parseTaskList(
    await esClient.search<RawTaskSource>(
      buildTasksByIdRequest(taskManagerIndex, taskIds, { overdue })
    )
  );
  return new Map(tasks.map((task) => [task.id, task]));
};

/** Lists stored tasks, followed by removed tasks that failed in the window when no status or overdue filter is set. */
const listStoredTasks = async (
  esClient: ElasticsearchClient,
  taskManagerIndex: string,
  eventLogIndexPattern: string | undefined,
  query: TaskListRequestQuery
): Promise<TaskListPage> => {
  const listsRemovedTasks = query.status === undefined && !query.overdue;
  const [storedTasks, removedTasks] = await Promise.all([
    esClient
      .search<RawTaskSource>(
        buildTaskListRequest(taskManagerIndex, {
          taskType: query.task_type,
          status: query.status,
          overdue: query.overdue,
          taskId: query.task_id,
          page: query.page,
          perPage: query.per_page,
          sortField: query.sort_field,
          sortOrder: query.sort_order,
        })
      )
      .then(parseTaskList),
    eventLogIndexPattern && listsRemovedTasks
      ? findRemovedFailedTasks(
          esClient,
          taskManagerIndex,
          eventLogIndexPattern,
          toFailedTasksQuery(query)
        )
      : [],
  ]);

  const from = (query.page - 1) * query.per_page;
  const removedFrom = Math.max(0, from - storedTasks.total);
  const pageRemovedTasks = removedTasks.slice(
    removedFrom,
    removedFrom + query.per_page - storedTasks.tasks.length
  );
  return {
    total: storedTasks.total + removedTasks.length,
    tasks: [...storedTasks.tasks.map(toStoredTaskListItem), ...pageRemovedTasks],
  };
};

/** Lists stored and removed tasks that failed in the window, latest failure first. */
const listFailedTasks = async (
  esClient: ElasticsearchClient,
  taskManagerIndex: string,
  eventLogIndexPattern: string | undefined,
  query: TaskListRequestQuery
): Promise<TaskListPage> => {
  if (!eventLogIndexPattern) {
    return EMPTY_TASK_LIST_PAGE;
  }
  const failedTasks = await findFailedTasks(
    esClient,
    eventLogIndexPattern,
    toFailedTasksQuery(query)
  );
  const storedTasks = await findStoredTasks(
    esClient,
    taskManagerIndex,
    failedTasks.map(({ taskId }) => taskId),
    { overdue: query.overdue }
  );
  const listedTasks = query.overdue
    ? failedTasks.filter(({ taskId }) => storedTasks.has(taskId))
    : failedTasks;

  const from = (query.page - 1) * query.per_page;
  return {
    total: listedTasks.length,
    tasks: listedTasks.slice(from, from + query.per_page).map((failedTask): TaskListItem => {
      const task = storedTasks.get(failedTask.taskId);
      return task
        ? { ...toStoredTaskListItem(task), last_failure: failedTask.run }
        : toRemovedTaskListItem(failedTask);
    }),
  };
};

/** Adds the last run of each task, and its latest failure in the window when not known yet. */
const withRunHistory = async (
  esClient: ElasticsearchClient,
  eventLogIndexPattern: string,
  window: TaskRunsWindow,
  tasks: TaskListItem[]
): Promise<TaskListItem[]> => {
  if (tasks.length === 0) {
    return tasks;
  }
  const taskIdsWithoutFailure = tasks
    .filter(({ last_failure: lastFailure }) => !lastFailure)
    .map(({ id }) => id);
  const [lastRuns, lastFailures] = await Promise.all([
    findLatestRuns(
      esClient,
      buildLastRunsRequest(
        eventLogIndexPattern,
        tasks.map(({ id }) => id)
      )
    ),
    taskIdsWithoutFailure.length > 0
      ? findLatestRuns(
          esClient,
          buildLastFailuresRequest(eventLogIndexPattern, window, taskIdsWithoutFailure)
        )
      : new Map<string, TaskLastRun>(),
  ]);
  return tasks.map((task) => {
    const lastRun = lastRuns.get(task.id) ?? task.last_run;
    const lastFailure = lastFailures.get(task.id) ?? task.last_failure;
    return {
      ...task,
      ...(lastRun ? { last_run: lastRun } : {}),
      ...(lastFailure ? { last_failure: lastFailure } : {}),
    };
  });
};

export function taskManagerUiRoutes({
  router,
  config,
  taskManagerIndex,
  getStartDependencies,
  getDefinitions,
  getEventLogIndexPattern,
}: TaskManagerUiRouteParams) {
  router.get(
    {
      path: `${TASK_MANAGER_UI_API_BASE_PATH}/overview`,
      security,
      validate: { query: overviewQuerySchema },
      options: { access: 'internal' },
    },
    async (_context, req, res) => {
      const window = toRunsWindow(req.query);
      const { esClient, executionControlService, discoveryService } = await getStartDependencies();
      const definitions = getDefinitions();
      const eventLogIndexPattern = getEventLogIndexPattern();

      const [taskOverviewResponse, taskRunsResponse, activeNodes, executionControl] =
        await Promise.all([
          esClient.search(buildTaskOverviewRequest(taskManagerIndex)),
          eventLogIndexPattern
            ? esClient.search(buildTaskRunsSummaryRequest(eventLogIndexPattern, window))
            : undefined,
          discoveryService.getActiveKibanaNodes(),
          executionControlService.read(),
        ]);

      const taskOverview = parseTaskOverview(taskOverviewResponse);
      const runsByTaskType = taskRunsResponse ? parseTaskRunsSummary(taskRunsResponse) : new Map();

      const taskTypes = new Set([...taskOverview.byTaskType.keys(), ...runsByTaskType.keys()]);
      const taskTypeSummaries: TaskTypeSummary[] = [...taskTypes].sort().map((taskType) => {
        const counts = taskOverview.byTaskType.get(taskType);
        const definition = definitions.get(taskType);
        return {
          task_type: taskType,
          registered: definition !== undefined,
          tasks: counts?.tasks ?? 0,
          overdue: counts?.overdue ?? 0,
          by_status: counts?.byStatus ?? {},
          ...(definition
            ? { definition: toTaskTypeDefinitionSummary(definition, config.max_attempts) }
            : {}),
          ...(runsByTaskType.has(taskType) ? { runs: runsByTaskType.get(taskType) } : {}),
        };
      });

      const body: TaskManagerUiOverviewResponse = {
        generated_at: new Date().toISOString(),
        window,
        event_log_available: eventLogIndexPattern !== undefined,
        totals: {
          tasks: taskOverview.tasks,
          overdue: taskOverview.overdue,
          by_status: taskOverview.byStatus,
        },
        nodes: activeNodes.map(({ id, attributes }) => ({ id, last_seen: attributes.last_seen })),
        execution_control: {
          paused: executionControl.paused,
          paused_task_types: executionControl.paused_task_types,
        },
        excluded_task_types: config.unsafe.exclude_task_types,
        task_types: taskTypeSummaries,
      };
      return res.ok({ body });
    }
  );

  router.get(
    {
      path: `${TASK_MANAGER_UI_API_BASE_PATH}/tasks`,
      security,
      validate: { query: taskListQuerySchema },
      options: { access: 'internal' },
    },
    async (_context, req, res) => {
      const { start, end, ...filters } = req.query;
      const query: TaskListRequestQuery = { ...filters, window: toRunsWindow({ start, end }) };
      const { esClient } = await getStartDependencies();
      const eventLogIndexPattern = getEventLogIndexPattern();

      const listTasks =
        query.status === FAILED_IN_WINDOW_FILTER ? listFailedTasks : listStoredTasks;
      const { total, tasks } = await listTasks(
        esClient,
        taskManagerIndex,
        eventLogIndexPattern,
        query
      );

      const body: TaskManagerUiTaskListResponse = {
        page: query.page,
        per_page: query.per_page,
        total,
        tasks: eventLogIndexPattern
          ? await withRunHistory(esClient, eventLogIndexPattern, query.window, tasks)
          : tasks,
      };
      return res.ok({ body });
    }
  );

  router.get(
    {
      path: `${TASK_MANAGER_UI_API_BASE_PATH}/tasks/{id}`,
      security,
      validate: { params: taskDetailParamsSchema, query: taskDetailQuerySchema },
      options: { access: 'internal' },
    },
    async (_context, req, res) => {
      const { id } = req.params;
      const window = toRunsWindow(req.query);
      const { esClient, executionControlService } = await getStartDependencies();
      const definitions = getDefinitions();
      const eventLogIndexPattern = getEventLogIndexPattern();

      const [taskResponse, recentRunsResponse, failuresResponse, executionControl] =
        await Promise.all([
          esClient.search<RawTaskSource>(buildTaskDetailRequest(taskManagerIndex, id)),
          eventLogIndexPattern
            ? esClient.search<RawTaskRunSource>(buildRecentRunsRequest(eventLogIndexPattern, id))
            : undefined,
          eventLogIndexPattern
            ? esClient.search<RawTaskRunSource>(
                buildTaskFailuresRequest(eventLogIndexPattern, id, window)
              )
            : undefined,
          executionControlService.read(),
        ]);

      const [hit] = taskResponse.hits.hits;
      const task = hit ? toTaskSummary(hit) : undefined;
      const taskType = task
        ? task.task_type
        : recentRunsResponse && getRecentRunsTaskType(recentRunsResponse);
      if (taskType === undefined) {
        return res.notFound({ body: { message: `Task ${id} not found` } });
      }

      const definition = definitions.get(taskType);
      const definitionSummary = definition
        ? toTaskTypeDefinitionSummary(definition, config.max_attempts)
        : undefined;
      const recentRuns = recentRunsResponse ? parseRecentRuns(recentRunsResponse) : [];
      const failuresInWindow = failuresResponse && parseTaskFailures(failuresResponse, window);

      const body: TaskManagerUiTaskDetailResponse = {
        ...(task ? { task } : {}),
        task_type: taskType,
        ...(definitionSummary ? { definition: definitionSummary } : {}),
        explanation: task
          ? explainTask(task, {
              now: new Date(),
              isRegistered: definition !== undefined,
              maxAttempts: definitionSummary?.max_attempts ?? config.max_attempts,
              excludedTaskTypes: config.unsafe.exclude_task_types,
              executionPaused: executionControl.paused,
              pausedTaskTypes: executionControl.paused_task_types,
              dueGracePeriodMs: config.poll_interval,
              recentRuns,
            })
          : explainRemovedTask(recentRuns),
        event_log_available: eventLogIndexPattern !== undefined,
        recent_runs: recentRuns,
        ...(failuresInWindow ? { failures_in_window: failuresInWindow } : {}),
      };
      return res.ok({ body });
    }
  );
}
