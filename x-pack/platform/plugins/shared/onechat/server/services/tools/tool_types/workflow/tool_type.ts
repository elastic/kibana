/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import { ToolType, platformCoreTools } from '@kbn/onechat-common';
import type { WorkflowToolConfig } from '@kbn/onechat-common/tools';
import { createErrorResult } from '@kbn/onechat-server';
import { cleanPrompt } from '@kbn/onechat-genai-utils/prompts';
import type { AnyToolTypeDefinition } from '../definitions';
import { executeWorkflow } from './execute_workflow';
import { generateSchema } from './generate_schema';
import { configurationSchema, configurationUpdateSchema } from './schemas';
import { validateWorkflowId } from './validation';

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
          return async (params, { request }) => {
            const { management: workflowApi } = workflowsManagement;
            const workflowId = config.workflow_id;

            try {
              const workflowResults = await executeWorkflow({
                request,
                spaceId,
                workflowApi,
                workflowId,
                workflowParams: params,
                waitFor: config.wait_for,
              });

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
          return cleanPrompt(`${description}

          ## Additional information
          - this tool executes the workflow with the ID '${config.workflow_id}'
          - the tool will wait up to ${config.wait_for} seconds for the workflow to complete
          - if the workflow isn't completed within the specified time, a workflow execution ID will be returned
          - the ${platformCoreTools.getWorkflowExecutionStatus} tool can be used later to check the status of the workflow execution
          - **important**: do **NOT** call the ${platformCoreTools.getWorkflowExecutionStatus} tool directly after calling this tool.
            Instead, if the workflow didn't complete, suggest to the user to ask you to check the status of the workflow execution.
            This is to prevent the user from calling the tool multiple times, which would result in multiple workflow executions being created.
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
