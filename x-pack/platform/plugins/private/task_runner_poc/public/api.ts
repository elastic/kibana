/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core/public';
import { INTERNAL_API_BASE_PATH, INTERNAL_API_VERSION } from '../common';
import type {
  CreateJobBody,
  CreateJobResponse,
  JobList,
  ResultDocument,
  TaskList,
} from '../common';

const LIST_LIMIT = 50;
const JOB_TASKS_LIMIT = 10;

export interface TaskRunnerApi {
  createJob(body: CreateJobBody): Promise<CreateJobResponse>;
  listJobs(): Promise<JobList>;
  deleteJob(jobId: string): Promise<void>;
  listJobTasks(jobId: string): Promise<TaskList>;
  listTasks(): Promise<TaskList>;
  getTaskOutput(taskId: string): Promise<ResultDocument>;
}

export const createApi = (http: HttpSetup): TaskRunnerApi => {
  const version = INTERNAL_API_VERSION;
  const path = (suffix: string) => `${INTERNAL_API_BASE_PATH}${suffix}`;

  return {
    createJob: (body) => http.post(path('/jobs'), { version, body: JSON.stringify(body) }),
    listJobs: () => http.get(path('/jobs'), { version, query: { limit: LIST_LIMIT } }),
    deleteJob: (jobId) => http.delete(path(`/jobs/${encodeURIComponent(jobId)}`), { version }),
    listJobTasks: (jobId) =>
      http.get(path(`/jobs/${encodeURIComponent(jobId)}/tasks`), {
        version,
        query: { limit: JOB_TASKS_LIMIT },
      }),
    listTasks: () => http.get(path('/tasks'), { version, query: { limit: LIST_LIMIT } }),
    getTaskOutput: (taskId) =>
      http.get(path(`/tasks/${encodeURIComponent(taskId)}/output`), { version }),
  };
};

/** The message from a Kibana error response, or from any other error. */
export const errorMessage = (error: unknown): string => {
  const body = (error as { body?: { message?: string } })?.body;
  if (body?.message) {
    return body.message;
  }
  return error instanceof Error ? error.message : String(error);
};
