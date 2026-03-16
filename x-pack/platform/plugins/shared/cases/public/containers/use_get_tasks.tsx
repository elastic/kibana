/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { getCaseTasks } from './api';
import { casesQueriesKeys } from './constants';
import type { FindTasksRequest } from './api';

export const useGetTasks = (caseId: string, params?: FindTasksRequest) => {
  return useQuery(
    casesQueriesKeys.tasksList(caseId, params),
    ({ signal }) => getCaseTasks(caseId, params, signal),
    {
      enabled: Boolean(caseId),
      keepPreviousData: true,
    }
  );
};

export type UseGetTasks = ReturnType<typeof useGetTasks>;
