/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import { ToolType, platformCoreTools } from '@kbn/agent-builder-common';
import type { WorkflowToolConfig } from '@kbn/agent-builder-common/tools';
import { createErrorResult } from '@kbn/agent-builder-server';
import { WAIT_FOR_COMPLETION_TIMEOUT_SEC } from '@kbn/agent-builder-common/tools/types/workflow';
import { cleanPrompt } from '@kbn/agent-builder-genai-utils/prompts';
import { isErrorResult } from '@kbn/agent-builder-genai-utils/tools/utils/results';
import { CONNECTOR_AUTHORIZATION_ERROR_NAME } from '@kbn/connector-specs/src/all_errors';
import { AuthorizationStatus } from '@kbn/agent-builder-common/agents/prompts';
import type { AnyToolTypeDefinition } from '../definitions';
import { executeWorkflow } from './execute_workflow';
import { generateSchema } from './generate_schema';
import { configurationSchema, configurationUpdateSchema } from './schemas';
import { validateWorkflowId } from './validation';

interface WorkflowToolState {
  connectorId?: string;
}

export const getWorkflowToolType = ({
  workflowsManagement,
}: {
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
          return async (params, { request, prompts, stateManager }) => {
            const { management: workflowApi } = workflowsManagement;
            const workflowId = config.workflow_id;

            const connectorId = stateManager.getState<WorkflowToolState>()?.connectorId;

            if (
              connectorId &&
              prompts.checkAuthorizationStatus(connectorId).status ===
                AuthorizationStatus.unauthorized
            ) {
              return {
                results: [
                  createErrorResult({
                    message: 'User cancelled authorization.',
                  }),
                ],
              };
            }

            try {
              const workflowResults = await executeWorkflow({
                request,
                spaceId,
                workflowApi,
                workflowId,
                workflowParams: params,
                waitForCompletion: config.wait_for_completion,
              });

              const [result] = workflowResults;

              if (isErrorResult(result) && result.data.metadata) {
                const { type, details } = result.data.metadata;
                if (type === CONNECTOR_AUTHORIZATION_ERROR_NAME) {
                  const errorDetails = details as { connectorId: string };

                  if (connectorId && errorDetails.connectorId === connectorId) {
                    return {
                      results: [
                        createErrorResult({
                          message: 'Detected authorization loop. Please try again later.',
                        }),
                      ],
                    };
                  }
                  stateManager.setState<WorkflowToolState>({
                    connectorId: errorDetails.connectorId,
                  });
                  return prompts.askForAuthorization({
                    connector_id: errorDetails.connectorId,
                  });
                }
              }

              return {
                results: workflowResults,
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
          - The ${platformCoreTools.getWorkflowExecutionStatus} tool can be used later to check the status of the workflow execution

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
