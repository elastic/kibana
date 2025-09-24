/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { WorkflowsPluginSetup } from '@kbn/workflows-management-plugin/server';
import { ExecutionStatus as WorkflowExecutionStatus } from '@kbn/workflows/types/v1';
import type { WorkflowToolConfig } from '@kbn/onechat-common/tools';
import { ToolResultType } from '@kbn/onechat-common/tools';
import { ToolType } from '@kbn/onechat-common';
import type { ToolHandlerReturn } from '@kbn/onechat-server';
import type { InternalToolDefinition } from '../../../tool_provider';
import type { ToolPersistedDefinition } from '../../client';
import type { ToolTypeConversionContext } from '../types';
import { generateSchema } from './generate_schema';

const WORKFLOW_MAX_WAIT = 60_000;
const WORKFLOW_INITIAL_WAIT = 1000;
const WORKFLOW_CHECK_INTERVAL = 2_500;

export const toToolDefinitionFactory = ({
  workflowsManagement,
}: {
  workflowsManagement: WorkflowsPluginSetup;
}) => {
  return function toToolDefinition<TSchema extends z.ZodObject<any> = z.ZodObject<any>>(
    workflowTool: ToolPersistedDefinition<WorkflowToolConfig>,
    { spaceId }: ToolTypeConversionContext
  ): InternalToolDefinition<WorkflowToolConfig, TSchema> {
    const { id, description, tags, configuration } = workflowTool;

    return {
      id,
      type: ToolType.workflow,
      description,
      tags,
      configuration,
      readonly: false,
      schema: async () => {
        const workflow = await workflowsManagement.management.getWorkflow(
          configuration.workflow_id,
          spaceId
        );
        if (!workflow) {
          // if workflow is not accessible, error will be handled elsewhere
          return z.object({}) as TSchema;
        }
        return generateSchema({ workflow }) as TSchema;
      },
      handler: async (params, { request }) => {
        const { management: workflowApi } = workflowsManagement;
        const workflowId = configuration.workflow_id;

        const workflow = await workflowApi.getWorkflow(workflowId, spaceId);

        if (!workflow) {
          return errorResult(`Workflow '${workflowId}' not found.`);
        }
        if (!workflow.enabled) {
          return errorResult(`Workflow '${workflowId}' is disabled and cannot be executed.`);
        }
        if (!workflow.valid) {
          return errorResult(
            `Workflow '${workflowId}' has validation errors and cannot be executed.`
          );
        }
        if (!workflow.definition) {
          return errorResult(`Workflow '${workflowId}' has no definition and cannot be executed.`);
        }

        const executionId = await workflowApi.runWorkflow(
          {
            id: workflow.id,
            name: workflow.name,
            enabled: workflow.enabled,
            definition: workflow.definition,
            yaml: workflow.yaml,
          },
          spaceId,
          params,
          request
        );

        const waitStart = Date.now();
        await waitMs(WORKFLOW_INITIAL_WAIT);

        do {
          try {
            const execution = await workflowApi.getWorkflowExecution(executionId, spaceId);

            if (execution) {
              if (execution.status === WorkflowExecutionStatus.COMPLETED) {
                return {
                  results: [
                    {
                      type: ToolResultType.other,
                      data: {
                        executionId,
                        status: execution.status,
                        finishedAt: execution.finishedAt,
                        details: execution.stepExecutions,
                      },
                    },
                  ],
                };
              }
              if (execution.status === WorkflowExecutionStatus.FAILED) {
                return {
                  results: [
                    {
                      type: ToolResultType.error,
                      data: {
                        message: `Workflow "${workflow.name}" failed.`,
                        metadata: {
                          workflowId,
                          executionId,
                          executionStatus: execution.status,
                        },
                      },
                    },
                  ],
                };
              }
            }
          } catch (e) {
            // trap - we just keep waiting until timeout
          }

          await waitMs(WORKFLOW_CHECK_INTERVAL);
        } while (Date.now() - waitStart < WORKFLOW_MAX_WAIT);

        // timeout-ed waiting without completion or failure status
        return errorResult(
          `Workflow '${workflowId}' executed but not completed after ${WORKFLOW_MAX_WAIT}ms.`
        );
      },
    };
  };
};

const errorResult = (error: string): ToolHandlerReturn => {
  return {
    results: [
      {
        type: ToolResultType.error,
        data: {
          message: error,
        },
      },
    ],
  };
};

const waitMs = async (durationMs: number) => {
  await new Promise((resolve) => setTimeout(resolve, durationMs));
};
