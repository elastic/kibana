/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolDefinitionWithSchema } from '@kbn/agent-builder-common';
import { ToolType } from '@kbn/agent-builder-common';
import type { BuiltinToolFormData } from '../components/tools/form/types/tool_form_types';

/**
 * Transforms a built-in tool definition into its UI form representation.
 * @param tool - The built-in tool definition to transform.
 * @returns The built-in tool form data.
 */
export const transformBuiltInToolToFormData = (
  tool: ToolDefinitionWithSchema
): BuiltinToolFormData => {
  return {
    toolId: tool.id,
    description: tool.description,
    labels: tool.tags,
    type: ToolType.builtin,
  };
};
