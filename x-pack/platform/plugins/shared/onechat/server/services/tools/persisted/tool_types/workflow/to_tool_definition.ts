/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { WorkflowsPluginSetup } from '@kbn/workflows-management-plugin/server';
import type { WorkflowToolConfig } from '@kbn/onechat-common/tools';
import { ToolResultType } from '@kbn/onechat-common/tools';
import { ToolType } from '@kbn/onechat-common';
import type { InternalToolDefinition } from '../../../tool_provider';
import type { ToolPersistedDefinition } from '../../client';
import type { ToolTypeConversionContext } from '../types';
import { generateSchema } from './generate_schema';
import { executeWorkflow } from './execute_workflow';

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
    };
  };
};
