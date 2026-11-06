/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const PLUGIN_ID = 'taskRunnerPoc';
export const PLUGIN_NAME = 'Task runner (POC)';

export const INTERNAL_API_BASE_PATH = '/internal/task_runner_poc';
export const INTERNAL_API_VERSION = '1';

export const API_PRIVILEGES = {
  read: 'read_task_runner_poc',
  manage: 'manage_task_runner_poc',
} as const;

export const TASK_TYPE = 'esql_summary';
export const RESULT_INDEX = 'tr-results';

export const DEFAULT_QUERY =
  'FROM logs-* | STATS errors = COUNT(*) WHERE log.level == "error" BY service.name';

/** The contract's limits on `every` (1s to 24h) and `runAt` (at most 30 days ahead). */
export const MIN_EVERY_SECONDS = 1;
export const MAX_EVERY_SECONDS = 24 * 60 * 60;
export const MAX_RUN_AT_AHEAD_MS = 30 * 24 * 60 * 60 * 1000;

export const JOB_ID_PATTERN = /^job_[A-Za-z0-9]+$/;
export const TASK_ID_PATTERN = /^job_[A-Za-z0-9]+:[0-9]+$/;

export type {
  CreateJobBody,
  CreateJobResponse,
  EsqlValue,
  Execution,
  ExecutionStatus,
  Job,
  JobList,
  ResultDocument,
  Task,
  TaskList,
  TaskRef,
  TaskStatus,
} from './types';
