/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LogMeta } from '@kbn/core/server';

/** Identity fields from task-runner/contract/logging.md. */
export interface TaskRunnerLogMeta extends LogMeta {
  task_runner: {
    project: { id: string };
    job?: { id: string };
    task?: { id: string };
  };
}

export const identityMeta = (
  { projectId, jobId, taskId }: { projectId: string; jobId?: string; taskId?: string | null },
  event?: { action: string; outcome: 'success' | 'failure' }
): TaskRunnerLogMeta => ({
  task_runner: {
    project: { id: projectId },
    ...(jobId ? { job: { id: jobId } } : {}),
    ...(taskId ? { task: { id: taskId } } : {}),
  },
  ...(event ? { event } : {}),
});
