/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolType, type McpToolDefinition } from '@kbn/agent-builder-common/tools';
import { omit } from 'lodash';
import type { CreateToolPayload, UpdateToolPayload } from '../../../common/http_api/tools';
import type { McpToolFormData } from '../components/tools/form/types/tool_form_types';

export const transformMcpToolToFormData = (tool: McpToolDefinition): McpToolFormData => {
  return {
    toolId: tool.id,
    description: tool.description,
    connectorId: tool.configuration.connector_id,
    mcpToolName: tool.configuration.tool_name,
    labels: tool.tags,
    type: ToolType.mcp,
  };
};

export const transformFormDataToMcpTool = (data: McpToolFormData): McpToolDefinition => {
  return {
    id: data.toolId,
    description: data.description,
    readonly: false,
    configuration: {
      connector_id: data.connectorId,
      tool_name: data.mcpToolName,
    },
    tags: data.labels,
    type: ToolType.mcp,
  };
};

// Form data → Create API payload
export const transformMcpFormDataForCreate = (data: McpToolFormData): CreateToolPayload => {
  return omit(transformFormDataToMcpTool(data), ['readonly']);
};

// Form data → Update API payload
export const transformMcpFormDataForUpdate = (data: McpToolFormData): UpdateToolPayload => {
  return omit(transformFormDataToMcpTool(data), ['id', 'type', 'readonly']);
};
