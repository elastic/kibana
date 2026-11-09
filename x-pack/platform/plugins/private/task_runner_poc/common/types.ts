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
  /** The explicit flow that owns the job; null for a standalone job. */
  flowId: string | null;
  taskType: string;
  workerType: string;
  params: Partial<EsqlSummaryParams>;
  every: string | null;
  runAt: string | null;
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
  /** Never null: the job's flow, or the implicit flow created when a standalone job fired. */
  flowId: string;
  jobId: string;
  taskType: string;
  workerType: string;
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
  /** The last finished execution's error; kept while retrying, null once one succeeds. */
  error: string | null;
  retryable: boolean | null;
  result: { rows?: number } | null;
  executions: Execution[];
}

export interface TaskList {
  tasks: Task[];
}

/** A repeated idempotency key returns the first response again, `taskId` included. */
export interface CreateJobResponse {
  jobId: string;
  /** Null for a scheduled job or a future `runAt`. */
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
  flowId: string;
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

/**
 * Body of the plugin's create-job route. Without `everySeconds` the job is one-shot. `runAt`
 * (ISO 8601) fires a one-shot job once at that time, or sets a scheduled job's first occurrence.
 */
export interface CreateJobBody {
  query: string;
  everySeconds?: number;
  runAt?: string;
  idempotencyKey?: string;
}
