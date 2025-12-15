/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolType } from '@kbn/onechat-common';
import type { ToolDefinitionWithSchema } from '@kbn/onechat-common';
import { z } from '@kbn/zod';

import { zodResolver } from '../../../../../utils/zod_resolver';
import type { ToolTypeRegistryEntry } from '../common';
import type { McpToolFormData } from '../../types/tool_form_types';
import { commonToolFormDefaultValues } from '../common';
import { labels } from '../../../../../utils/i18n';

/**
 * Transforms an MCP tool definition into its UI form representation.
 */
const transformMcpToolToFormData = (tool: ToolDefinitionWithSchema): McpToolFormData => {
  return {
    toolId: tool.id,
    description: tool.description,
    labels: tool.tags,
    type: ToolType.mcp,
  };
};

// MCP tools are created via bulk import from MCP connectors, not via the form
export const mcpToolRegistryEntry: ToolTypeRegistryEntry<McpToolFormData> = {
  label: labels.tools.mcpLabel,
  getConfigurationComponent: () => {
    throw new Error("MCP tools don't have a configuration component");
  },
  defaultValues: {
    ...commonToolFormDefaultValues,
    type: ToolType.mcp,
  },
  toolToFormData: transformMcpToolToFormData,
  formDataToCreatePayload: () => {
    throw new Error('MCP tools cannot be created via the form');
  },
  formDataToUpdatePayload: () => {
    throw new Error('MCP tools cannot be updated via the form');
  },
  getValidationResolver: () => zodResolver(z.any({})),
};

