/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ExecutionStatus, isTerminalStatus } from '@kbn/workflows';
import { TaskStatus, baseFeatureSchema, iterationResultSchema } from '@kbn/streams-schema';
import type { IdentifyFeaturesResult, TaskResult } from '@kbn/streams-schema';
import type { WorkflowExecutionResult } from '../../lib/workflows/workflow_client';
import { deriveTotalTokensUsed } from '../../lib/sig_events/features';

const workflowOutputSchema = z.object({
  streamName: z.string().optional(),
  discoveredFeatures: z.array(baseFeatureSchema).default([]),
  computedFeaturesCount: z.number().optional(),
  iterations: z.array(iterationResultSchema).optional(),
});

export function workflowExecutionToTaskResult(
  execution: WorkflowExecutionResult
): TaskResult<IdentifyFeaturesResult> {
  if (execution.status === ExecutionStatus.COMPLETED) {
    const parsed = workflowOutputSchema.safeParse(execution.output ?? {});

    if (!parsed.success) {
      return {
        status: TaskStatus.Failed,
        error: `Workflow output validation failed: ${parsed.error.message}`,
      };
    }

    const { discoveredFeatures, iterations } = parsed.data;

    return {
      status: TaskStatus.Completed,
      features: discoveredFeatures,
      durationMs: execution.duration ?? 0,
      totalTokensUsed: iterations ? deriveTotalTokensUsed(iterations) : undefined,
      iterations,
    };
  }

  if (isTerminalStatus(execution.status)) {
    return {
      status: TaskStatus.Failed,
      error: execution.error ?? `Workflow execution ${execution.executionId} ${execution.status}`,
    };
  }

  return { status: TaskStatus.InProgress };
}
