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

export const createWorkflowToolType = ({
  workflowsManagement,
}: {
  workflowsManagement: WorkflowsPluginSetup;
}): PersistedToolTypeDefinition<WorkflowToolConfig> => {
  return {
    toolType: ToolType.workflow,
    toToolDefinition: toToolDefinitionFactory({ workflowsManagement }),
    createSchema: configurationSchema,
    updateSchema: configurationUpdateSchema,
    validateForCreate: async (config) => {
      // TODO: validation
      return config;
    },
    validateForUpdate: async (update, current) => {
      // TODO: validation
      return {
        ...current,
        ...update,
      };
    },
  };
};
