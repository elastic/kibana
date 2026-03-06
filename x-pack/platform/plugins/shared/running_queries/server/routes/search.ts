/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TasksTaskInfo } from '@elastic/elasticsearch/lib/api/types';
import {
  API_BASE_PATH,
  RUNNING_QUERIES_READ_PRIVILEGE,
  RUNNING_QUERIES_MIN_RUNNING_TIME_SETTING,
} from '../../common/constants';
import type { RouteOptions } from '.';
import { transformTasks } from '../lib/transform_tasks';

export const registerSearchRoute = ({ router, logger }: RouteOptions) => {
  router.get(
    {
      path: `${API_BASE_PATH}/search`,
      security: {
        authz: {
          requiredPrivileges: [RUNNING_QUERIES_READ_PRIVILEGE],
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
        const esClient = coreContext.elasticsearch.client.asCurrentUser;
        const minRunningTimeMs = await coreContext.uiSettings.client.get<number>(
          RUNNING_QUERIES_MIN_RUNNING_TIME_SETTING
        );
        const thresholdNanos = minRunningTimeMs * 1_000_000;

        const result = await esClient.tasks.list({
          detailed: true,
          group_by: 'none',
          actions: [
            'indices:data/read/search*',
            'indices:data/read/esql*',
            'indices:data/read/eql*',
            'indices:data/read/sql*',
            'indices:data/read/msearch*',
            'indices:data/read/async_search*',
          ],
        });

        const tasks = (result.tasks ?? []) as TasksTaskInfo[];
        const queries = transformTasks(tasks, thresholdNanos);

        return response.ok({ body: { queries } });
      } catch (error) {
        logger.error(`Failed to fetch running queries: ${error}`);
        return response.customError({
          statusCode: (error as { statusCode?: number })?.statusCode ?? 500,
          body: { message: 'Failed to fetch running queries' },
        });
      }
    }
  );
};
