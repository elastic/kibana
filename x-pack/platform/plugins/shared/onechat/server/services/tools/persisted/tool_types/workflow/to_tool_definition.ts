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
import type { ToolTypConversionContext } from '../types';

export const toToolDefinitionFactory = ({
  workflowsManagement,
}: {
  workflowsManagement: WorkflowsPluginSetup;
}) => {
  return function toToolDefinition<TSchema extends z.ZodObject<any> = z.ZodObject<any>>(
    workflowTool: ToolPersistedDefinition<WorkflowToolConfig>,
    context: ToolTypConversionContext
  ): InternalToolDefinition<WorkflowToolConfig, TSchema> {
    const { id, description, tags, configuration } = workflowTool;
    return {
      id,
      type: ToolType.workflow,
      description,
      tags,
      configuration,
      readonly: false,
      schema: z.object({}) as TSchema, // we will handle schema gen later
      handler: async (params, { esClient }) => {
        const { management: workflowApi } = workflowsManagement;

        // TODO: space
        const workflow = await workflowApi.getWorkflow(configuration.workflow_id, 'default');

        // TODO: execute/handle
        const workflowId = workflow?.id ?? configuration.workflow_id;

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                workflowId,
              },
            },
          ],
        };
      },
    };
  };
};
