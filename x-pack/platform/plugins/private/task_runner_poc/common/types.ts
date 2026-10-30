/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Shapes from task-runner/contract/openapi.yaml and schemas/result-doc.schema.json (contract v1).

export type TaskStatus =
  | 'queued'
  | 'running'
  | 'retrying'
  | 'succeeded'
  | 'failed'
  | 'timed_out'
  | 'cancelled';

export type ExecutionStatus = 'running' | 'succeeded' | 'failed' | 'timed_out' | 'cancelled';

export interface EsqlSummaryParams {
  query: string;
  resultIndex: string;
}

export interface TaskRef {
  taskId: string;
  status: TaskStatus;
  finishedAt: string | null;
}

export interface Job {
  jobId: string;
  projectId: string;
  flowId: string | null;
  taskType: string;
  params: Partial<EsqlSummaryParams>;
  every: string | null;
  timeout: string;
  maxExecutions: number;
  createdAt: string;
  nextFireAt: string | null;
  running: boolean;
  lastTask: TaskRef | null;
}

export interface JobList {
  jobs: Job[];
}

export interface Execution {
  execution: number;
  status: ExecutionStatus;
  workerId: string;
  startedAt: string;
  finishedAt: string | null;
  durationMs: number | null;
  error: string | null;
}

export interface Task {
  taskId: string;
  projectId: string;
  flowId: string | null;
  jobId: string;
  taskType: string;
  params: Partial<EsqlSummaryParams>;
  status: TaskStatus;
  execution: number;
  maxExecutions: number;
  timeout: string;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  nextExecutionAt: string | null;
  durationMs: number | null;
  workerId: string | null;
  error: string | null;
  retryable: boolean | null;
  result: { rows?: number } | null;
  executions: Execution[];
}

export interface TaskList {
  tasks: Task[];
}

export interface CreateJobResponse {
  jobId: string;
  taskId: string | null;
}

export type EsqlValue =
  | string
  | number
  | boolean
  | null
  | EsqlValue[]
  | { [key: string]: EsqlValue };

export interface ResultDocument {
  '@timestamp': string;
  projectId: string;
  flowId: string | null;
  jobId: string;
  taskId: string;
  execution: number;
  taskType: string;
  query: string;
  columns: Array<{ name: string; type: string }>;
  values: EsqlValue[][];
  rowCount: number;
  truncated: boolean;
}

/** Body of the plugin's create-job route. Without `everySeconds` the job is one-shot. */
export interface CreateJobBody {
  query: string;
  everySeconds?: number;
  idempotencyKey?: string;
}
