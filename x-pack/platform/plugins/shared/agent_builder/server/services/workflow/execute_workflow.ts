/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import { SpanKind } from '@opentelemetry/api';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import {
  ElasticGenAIAttributes,
  GenAISemanticConventions,
  withActiveInferenceSpan,
} from '@kbn/inference-tracing';
import { toWorkflowExecutionState } from '@kbn/agent-builder-tools-base/workflows';
import type { WorkflowExecutionResult } from './types';

type WorkflowApi = WorkflowsServerPluginSetup['management'];

const DEFAULT_COMPLETION_TIMEOUT_SEC = 120;

export interface ExecuteWorkflowParams {
  workflowId: string;
  workflowParams: Record<string, unknown>;
  request: KibanaRequest;
  spaceId: string;
  workflowApi: WorkflowApi;
  waitForCompletion?: boolean;
  completionTimeoutSec?: number;
  metadata?: Record<string, unknown>;
}

export const executeWorkflow = async ({
  workflowId,
  workflowParams,
  request,
  spaceId,
  workflowApi,
  waitForCompletion = true,
  completionTimeoutSec = DEFAULT_COMPLETION_TIMEOUT_SEC,
  metadata,
}: ExecuteWorkflowParams): Promise<WorkflowExecutionResult> => {
  return withActiveInferenceSpan(
    `invoke_workflow ${workflowId}`,
    {
      kind: SpanKind.INTERNAL,
      attributes: {
        [ElasticGenAIAttributes.InferenceSpanKind]: 'CHAIN',
        [GenAISemanticConventions.GenAIOperationName]: 'invoke_workflow',
        'elastic.workflow.id': workflowId,
      },
    },
    async (span) => {
      try {
        const executeResult = await workflowApi.executeWorkflow({
          workflowId,
          inputs: workflowParams,
          request,
          spaceId,
          waitForCompletion,
          completionTimeoutSec,
          metadata,
        });

        span?.setAttribute('elastic.workflow.execution_id', executeResult.workflowExecutionId);

        if (executeResult.execution) {
          const workflowName = executeResult.execution.workflowDefinition.name;
          span?.setAttribute(GenAISemanticConventions.GenAIWorkflowName, workflowName);
          span?.updateName(`invoke_workflow ${workflowName}`);
          const result: WorkflowExecutionResult = {
            success: true,
            execution: toWorkflowExecutionState(executeResult.execution),
          };
          return result;
        }

        const result: WorkflowExecutionResult = {
          success: false,
          error: `Workflow '${workflowId}' executed but execution not found after ${completionTimeoutSec}s.`,
        };
        return result;
      } catch (e) {
        const result: WorkflowExecutionResult = {
          success: false,
          error: e instanceof Error ? e.message : String(e),
        };
        return result;
      }
    }
  );
};
