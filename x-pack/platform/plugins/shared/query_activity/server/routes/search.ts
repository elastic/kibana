/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TasksTaskInfo } from '@elastic/elasticsearch/lib/api/types';
import pLimit from 'p-limit';
import {
  API_BASE_PATH,
  QUERY_ACTIVITY_READ_PRIVILEGE,
  QUERY_ACTIVITY_MIN_RUNNING_TIME_SETTING,
} from '../../common/constants';
import type { RouteOptions } from '.';
import { isQueryTaskCandidate, QUERY_TASK_ACTIONS, transformTasks } from '../lib/transform_tasks';

const TASK_DETAILS_CONCURRENCY = 10;

const LIST_FILTER_PATH = [
  'tasks.node',
  'tasks.id',
  'tasks.action',
  'tasks.parent_task_id',
  'tasks.running_time_in_nanos',
];

const GET_FILTER_PATH = [
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
];

const getErrorStatusCode = (error: unknown): number | undefined => {
  const typedError = error as { statusCode?: number; meta?: { statusCode?: number } };
  return typedError?.statusCode ?? typedError?.meta?.statusCode;
};

export const registerSearchRoute = ({ router, logger }: RouteOptions) => {
  router.get(
    {
      path: `${API_BASE_PATH}/search`,
      security: {
        authz: {
          requiredPrivileges: [QUERY_ACTIVITY_READ_PRIVILEGE],
        },
      },
      validate: false,
      options: {
        access: 'internal',
      },
    },
    async (context, _request, response) => {
      try {
        const coreContext = await context.core;

        // In ESS, verify the user has the ES monitor cluster privilege before proceeding.
        // In Serverless, security?.hasPrivileges is absent so the check is silently skipped —
        // GET /_tasks is an internal-only API that requires operator-level access there,
        // and Kibana RBAC (requiredPrivileges above) is the authorization gate.
        const esPrivileges =
          await coreContext.elasticsearch.client.asCurrentUser.security?.hasPrivileges?.({
            cluster: ['monitor'],
          });
        if (esPrivileges && !esPrivileges.cluster?.monitor) {
          return response.forbidden({
            body: { message: 'Insufficient privileges to view queries' },
          });
        }

        // asInternalUser is intentional: in Serverless, GET /_tasks is an internal-only API
        // that requires operator-level access. Kibana RBAC (requiredPrivileges above) is the
        // authorization gate; the pre-flight hasPrivileges check above enforces ES privileges in ESS.
        const esClient = coreContext.elasticsearch.client.asInternalUser;
        const minRunningTimeMs = await coreContext.uiSettings.client.get<number>(
          QUERY_ACTIVITY_MIN_RUNNING_TIME_SETTING
        );
        const thresholdNanos = minRunningTimeMs * 1_000_000;

        const result = await esClient.tasks.list({
          detailed: false,
          group_by: 'none',
          actions: [...QUERY_TASK_ACTIONS],
          filter_path: LIST_FILTER_PATH,
        });

        const taskCandidates = ((result.tasks ?? []) as TasksTaskInfo[]).filter((task) =>
          isQueryTaskCandidate(task, thresholdNanos)
        );
        const limit = pLimit(TASK_DETAILS_CONCURRENCY);
        const taskDetails = await Promise.all(
          taskCandidates.map((task) =>
            limit(async () => {
              try {
                const taskId = `${task.node}:${task.id}`;
                const getResult = await esClient.tasks.get({
                  task_id: taskId,
                  wait_for_completion: false,
                  filter_path: GET_FILTER_PATH,
                });
                return getResult.completed ? undefined : getResult.task;
              } catch (error) {
                // Tasks can finish between the list and get requests.
                if (getErrorStatusCode(error) === 404) {
                  return undefined;
                }
                throw error;
              }
            })
          )
        );
        const detailedTasks = taskDetails.filter(
          (task): task is TasksTaskInfo => task !== undefined
        );
        const queries = transformTasks(detailedTasks, thresholdNanos);

        return response.ok({ body: { queries } });
      } catch (error) {
        logger.error(`Failed to fetch query activity: ${error}`);
        return response.customError({
          statusCode: getErrorStatusCode(error) ?? 500,
          body: { message: 'Failed to fetch query activity' },
        });
      }
    }
  );
};
