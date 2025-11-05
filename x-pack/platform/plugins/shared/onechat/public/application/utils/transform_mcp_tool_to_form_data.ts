/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolDefinitionWithSchema } from '@kbn/onechat-common';
import { ToolType } from '@kbn/onechat-common';
import type { McpToolFormData } from '../components/tools/form/types/tool_form_types';

export const transformMcpToolToFormData = (tool: ToolDefinitionWithSchema): McpToolFormData => {
  return {
    toolId: tool.id,
    description: tool.description,
    labels: tool.tags,
    type: ToolType.mcp,
    configuration: {},
  };
};
