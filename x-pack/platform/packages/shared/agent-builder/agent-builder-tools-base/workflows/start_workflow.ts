/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import { SpanKind } from '@opentelemetry/api';
import {
  toWorkflowExecutionEngineModel,
  type WorkflowExecutionEngineModelSource,
} from '@kbn/workflows';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import {
  ElasticGenAIAttributes,
  GenAISemanticConventions,
  withActiveInferenceSpan,
} from '@kbn/inference-tracing';

type WorkflowApi = WorkflowsServerPluginSetup['management'];

export interface StartWorkflowParams {
  /** The saved workflow to run, as returned by `WorkflowsManagementApi.getWorkflow`. */
  workflow: WorkflowExecutionEngineModelSource;
  workflowParams: Record<string, unknown>;
  request: KibanaRequest;
  spaceId: string;
  workflowApi: WorkflowApi;
  triggeredBy?: string;
  metadata?: Record<string, unknown>;
}

export type StartWorkflowResult =
  | { success: true; executionId: string }
  | { success: false; error: string };

/**
 * Schedules a saved workflow and returns its execution id without waiting for the run.
 *
 * Prefer this over `executeWorkflow` when the caller only wants to start the run and poll for
 * status: `executeWorkflow` waits for the execution document to appear even with
 * `waitForCompletion: false`, which is a second of latency the caller never uses. Unlike
 * `executeWorkflow` this does not refuse a disabled workflow, so a caller that cares must check
 * `enabled` itself.
 */
export const startWorkflow = async ({
  workflow,
  workflowParams,
  request,
  spaceId,
  workflowApi,
  triggeredBy,
  metadata,
}: StartWorkflowParams): Promise<StartWorkflowResult> => {
  return withActiveInferenceSpan(
    `start_workflow ${workflow.id}`,
    {
      kind: SpanKind.INTERNAL,
      attributes: {
        [ElasticGenAIAttributes.InferenceSpanKind]: 'CHAIN',
        [GenAISemanticConventions.GenAIOperationName]: 'start_workflow',
        [GenAISemanticConventions.GenAIWorkflowName]: workflow.name,
        'elastic.workflow.id': workflow.id,
      },
    },
    async (span) => {
      try {
        const executionId = await workflowApi.runWorkflow(
          toWorkflowExecutionEngineModel(workflow),
          spaceId,
          workflowParams,
          request,
          triggeredBy,
          metadata
        );

        span?.setAttribute('elastic.workflow.execution_id', executionId);

        return { success: true, executionId };
      } catch (e) {
        return { success: false, error: e instanceof Error ? e.message : String(e) };
      }
    }
  );
};
