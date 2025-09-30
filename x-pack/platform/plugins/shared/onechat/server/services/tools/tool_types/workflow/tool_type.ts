/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { WorkflowsPluginSetup } from '@kbn/workflows-management-plugin/server';
import { ToolResultType, ToolType } from '@kbn/onechat-common';
import type { WorkflowToolConfig } from '@kbn/onechat-common/tools';
import type { AnyToolTypeDefinition } from '../definitions';
import { executeWorkflow } from './execute_workflow';
import { generateSchema } from './generate_schema';

export const getWorkflowToolType = ({
  workflowsManagement,
}: {
  workflowsManagement?: WorkflowsPluginSetup;
}): AnyToolTypeDefinition<ToolType.workflow, WorkflowToolConfig, z.ZodObject<any>> => {
  // workflow plugin not present - we disable the workflow tool type
  if (!workflowsManagement) {
    return {
      type: ToolType.workflow,
      disabled: true,
    };
  }

  return {
    type: ToolType.workflow,
    getGeneratedProps: (config, { spaceId }) => {
      return {
        handler: async (params, { request }) => {
          const { management: workflowApi } = workflowsManagement;
          const workflowId = config.workflow_id;

          try {
            const workflowResults = await executeWorkflow({
              request,
              spaceId,
              workflowApi,
              workflowId,
              workflowParams: params,
            });

            return {
              results: workflowResults,
            };
          } catch (e) {
            return {
              results: [
                {
                  type: ToolResultType.error,
                  data: {
                    message: `Error executing workflow: ${e}`,
                    metadata: {
                      workflowId,
                    },
                  },
                },
              ],
            };
          }
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
      };
    },
  };
};
