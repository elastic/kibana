/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import type { SecurityPluginStart } from '@kbn/security-plugin-types-server';
import { ToolType, platformCoreTools, createForbiddenError } from '@kbn/agent-builder-common';
import type { WorkflowToolConfig } from '@kbn/agent-builder-common/tools';
import { createErrorResult, getAgentFromRunContext } from '@kbn/agent-builder-server';
import { WAIT_FOR_COMPLETION_TIMEOUT_SEC } from '@kbn/agent-builder-common/tools/types/workflow';
import { cleanPrompt } from '@kbn/agent-builder-genai-utils/prompts';
import { errorResult, otherResult } from '@kbn/agent-builder-genai-utils/tools/utils/results';
import {
  executeWorkflow,
  hasWorkflowReadPrivilege,
  hasWorkflowExecutePrivilege,
} from '@kbn/agent-builder-tools-base/workflows';
import type { AnyToolTypeDefinition } from '../definitions';
import { generateSchema } from './generate_schema';
import { configurationSchema, configurationUpdateSchema } from './schemas';
import { validateWorkflowId } from './validation';

export const getWorkflowToolType = ({
  workflowsManagement,
  security,
}: {
  workflowsManagement?: WorkflowsServerPluginSetup;
  security: SecurityPluginStart | undefined;
}): AnyToolTypeDefinition<ToolType.workflow, WorkflowToolConfig, z.ZodObject<any>> => {
  // workflow plugin not present - we disable the workflow tool type
  if (!workflowsManagement) {
    return {
      toolType: ToolType.workflow,
      disabled: true,
    };
  }

  return {
    toolType: ToolType.workflow,
    getDynamicProps: (config, { spaceId }) => {
      return {
        getHandler: () => {
          return async (params, { request, runContext }) => {
            const { management: workflowApi } = workflowsManagement;
            const workflowId = config.workflow_id;
            const agentId = getAgentFromRunContext(runContext)?.agentId;

            const canExecute = await hasWorkflowExecutePrivilege({ security, request, spaceId });
            if (!canExecute) {
              return {
                results: [
                  errorResult(
                    `Unauthorized to execute workflow '${workflowId}'. The 'workflowsManagement' execute and read privileges are required.`
                  ),
                ],
              };
            }

            try {
              const result = await executeWorkflow({
                request,
                spaceId,
                workflowApi,
                workflowId,
                workflowParams: params,
                waitForCompletion: config.wait_for_completion,
                metadata: agentId ? { agent_id: agentId } : undefined,
              });

              const toolResults = result.success
                ? [otherResult({ execution: result.execution })]
                : [errorResult(result.error)];

              return {
                results: toolResults,
              };
            } catch (e) {
              return {
                results: [
                  createErrorResult({
                    message: `Error executing workflow: ${e}`,
                    metadata: {
                      workflowId,
                    },
                  }),
                ],
              };
            }
          };
        },
        getSchema: async () => {
          const workflow = await workflowsManagement.management.getWorkflow(
            config.workflow_id,
            spaceId
          );
          if (!workflow) {
            // if workflow is not accessible, error will be handled elsewhere
            return z.object({});
          }
          return generateSchema({ workflow });
        },
        getLlmDescription: ({ description }) => {
          const wait = config.wait_for_completion ?? true;

          const waitInstruction = wait
            ? `The tool will execute the workflow and then wait for it to complete up to ${WAIT_FOR_COMPLETION_TIMEOUT_SEC}s`
            : 'The tool will execute the workflow and return immediately without waiting for its completion';

          return cleanPrompt(`${description}

          ## Additional information
          - This tool executes the workflow with the ID '${config.workflow_id}'
          - ${waitInstruction}
          - If the workflow wasn't completed, a workflow execution ID will be returned.
          - The ${platformCoreTools.getWorkflowExecutionStatus} tool can be used later to check the status of the workflow execution.
          - If the workflow returns with status "waiting_for_input", it is paused and requires human input to continue.
            The response will include a "waiting_input" object with "step_execution_id" (id of the paused step execution instance),
            a "message" (what the workflow is asking for), and an optional "schema" (JSON Schema describing the expected input fields).
            Use the ${platformCoreTools.resumeWorkflowExecution} tool to provide the required input and resume the workflow.

          `);
        },
      };
    },
    createSchema: configurationSchema,
    updateSchema: configurationUpdateSchema,
    validateForCreate: async ({ config, context: { spaceId, request } }) => {
      await assertWorkflowReadPrivilege({
        security,
        request,
        spaceId,
        workflowId: config.workflow_id,
      });
      await validateWorkflowId({
        workflows: workflowsManagement,
        workflowId: config.workflow_id,
        spaceId,
      });
      return config;
    },
    validateForUpdate: async ({ update, current, context: { spaceId, request } }) => {
      const mergedConfig = {
        ...current,
        ...update,
      };
      await assertWorkflowReadPrivilege({
        security,
        request,
        spaceId,
        workflowId: mergedConfig.workflow_id,
      });
      await validateWorkflowId({
        workflows: workflowsManagement,
        workflowId: mergedConfig.workflow_id,
        spaceId,
      });

      return mergedConfig;
    },
  };
};

const assertWorkflowReadPrivilege = async ({
  security,
  request,
  spaceId,
  workflowId,
}: {
  security: SecurityPluginStart | undefined;
  request: KibanaRequest;
  spaceId: string;
  workflowId: string;
}): Promise<void> => {
  const canRead = await hasWorkflowReadPrivilege({ security, request, spaceId });
  if (!canRead) {
    throw createForbiddenError(
      `Unauthorized to reference workflow '${workflowId}'. The 'workflowsManagement' read privilege is required.`
    );
  }
};
