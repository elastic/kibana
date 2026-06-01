/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import { ExecutionStatus } from '@kbn/workflows';
import { ToolType, platformCoreTools } from '@kbn/agent-builder-common';
import { AgentPromptType } from '@kbn/agent-builder-common/agents';
import type { FormPromptRequest } from '@kbn/agent-builder-common/agents';
import type { WorkflowToolConfig } from '@kbn/agent-builder-common/tools';
import { createErrorResult, getAgentFromRunContext } from '@kbn/agent-builder-server';
import { WAIT_FOR_COMPLETION_TIMEOUT_SEC } from '@kbn/agent-builder-common/tools/types/workflow';
import { cleanPrompt } from '@kbn/agent-builder-genai-utils/prompts';
import { errorResult, otherResult } from '@kbn/agent-builder-genai-utils/tools/utils/results';
import type { AnyToolTypeDefinition } from '../definitions';
import { executeWorkflow } from '../../../workflow';
import { generateSchema } from './generate_schema';
import { configurationSchema, configurationUpdateSchema } from './schemas';
import { validateWorkflowId } from './validation';

export const getWorkflowToolType = ({
  inboxEnabled,
  workflowsManagement,
}: {
  inboxEnabled?: boolean;
  workflowsManagement?: WorkflowsServerPluginSetup;
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
          return async (params, { logger, request, runContext }) => {
            const { management: workflowApi } = workflowsManagement;
            const workflowId = config.workflow_id;
            const agentId = getAgentFromRunContext(runContext)?.agentId;

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

              if (!result.success) {
                return { results: [errorResult(result.error)] };
              }

              const toolResults = [otherResult({ execution: result.execution })];

              if (inboxEnabled && result.execution.status === ExecutionStatus.WAITING_FOR_INPUT) {
                const { waiting_input: waitingInput, resume_seq: resumeSeq } = result.execution;
                const formPrompt: FormPromptRequest = {
                  ...(waitingInput?.agent_context !== undefined && {
                    agent_context: waitingInput.agent_context,
                  }),
                  execution_id: result.execution.execution_id,
                  id: waitingInput?.step_execution_id ?? '',
                  message: waitingInput?.message ?? '',
                  resume_seq: typeof resumeSeq === 'number' ? resumeSeq : 0,
                  schema: waitingInput?.schema ?? {},
                  step_execution_id: waitingInput?.step_execution_id ?? '',
                  type: AgentPromptType.form,
                };
                const schemaKeys = Object.keys(
                  (formPrompt.schema as { properties?: Record<string, unknown> }).properties ??
                    formPrompt.schema ??
                    {}
                ).length;
                logger.debug(
                  () =>
                    `[hitl-debug][ab] workflowTool.formPrompt exec=${
                      result.execution.execution_id
                    } schemaKeys=${schemaKeys} messagePresent=${!!formPrompt.message}`
                );
                return { prompt: formPrompt, results: toolResults };
              }

              return { results: toolResults };
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
    validateForCreate: async ({ config, context: { spaceId } }) => {
      await validateWorkflowId({
        workflows: workflowsManagement,
        workflowId: config.workflow_id,
        spaceId,
      });
      return config;
    },
    validateForUpdate: async ({ update, current, context: { spaceId } }) => {
      const mergedConfig = {
        ...current,
        ...update,
      };
      await validateWorkflowId({
        workflows: workflowsManagement,
        workflowId: mergedConfig.workflow_id,
        spaceId,
      });

      return mergedConfig;
    },
  };
};
