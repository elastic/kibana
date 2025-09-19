/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolType } from '@kbn/onechat-common';
import type { WorkflowToolConfig } from '@kbn/onechat-common/tools';
import type { WorkflowsPluginSetup } from '@kbn/workflows-management-plugin/server';

import type { PersistedToolTypeDefinition } from '../types';
import { toToolDefinitionFactory } from './to_tool_definition';
import { configurationSchema, configurationUpdateSchema } from './schemas';
import { validateWorkflowId } from './validation';

export const createWorkflowToolType = ({
  workflowsManagement,
}: {
  workflowsManagement: WorkflowsPluginSetup;
}): PersistedToolTypeDefinition<WorkflowToolConfig> => {
  // TODO: fix and get spaceId from request
  const spaceId = 'default';

  return {
    toolType: ToolType.workflow,
    toToolDefinition: toToolDefinitionFactory({ workflowsManagement }),
    createSchema: configurationSchema,
    updateSchema: configurationUpdateSchema,
    validateForCreate: async ({ config }) => {
      await validateWorkflowId({
        workflows: workflowsManagement,
        workflowId: config.workflow_id,
        spaceId,
      });
      return config;
    },
    validateForUpdate: async ({ update, current }) => {
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
