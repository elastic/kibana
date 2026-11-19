/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsWorkflowExecution } from '@kbn/workflows';
import { handlePostExecutionLoop } from './handle_post_execution_loop';

/** Retries pending identity-failure cleanup without replaying cleanup for other terminal executions. */
export const completeIdentityFailureCleanup = async (
  execution: EsWorkflowExecution,
  params: Parameters<typeof handlePostExecutionLoop>[0]
): Promise<void> => {
  if (!execution.context?.serviceAccountFailureCleanupPending) return;
  await handlePostExecutionLoop(params);
};
