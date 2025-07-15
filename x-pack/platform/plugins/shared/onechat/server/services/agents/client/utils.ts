/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createBadRequestError } from '@kbn/onechat-common';
import type { ToolSelection } from '@kbn/onechat-common';
import type { KibanaRequest } from '@kbn/core/server';
import type { ToolRegistry } from '../../tools';
import type { InternalToolDefinition } from '../../tools/tool_provider';

// - Must start and end with letter or digit
// - Can contain letters, digits, hyphens, underscores
const idRegexp = /^[a-z0-9](?:[a-z0-9_-]*[a-z0-9])?$/;

export const ensureValidId = (id: string) => {
  if (!idRegexp.test(id)) {
    throw createBadRequestError(`Invalid profile id: ${id}`);
  }
};

export interface ValidateToolSelectionParams {
  toolRegistry: ToolRegistry;
  request: KibanaRequest;
  toolSelection: ToolSelection[];
}

export async function validateToolSelection({
  toolRegistry,
  request,
  toolSelection,
}: ValidateToolSelectionParams): Promise<string[]> {
  const errors: string[] = [];
  const allTools = await toolRegistry.list({ request });
  const allToolTypes = new Set(allTools.map((t: InternalToolDefinition) => t.type));

  for (const selection of toolSelection) {
    const { type, tool_ids: toolIds } = selection;

    for (const toolId of toolIds) {
      if (toolId === '*') {
        // Wildcard selection - check if tool type exists
        if (type && !allToolTypes.has(type)) {
          errors.push(`Tool type '${type}' does not exist.`);
        }
      } else {
        // Specific tool selection
        if (type) {
          // Tool type specified - first check if the type exists
          if (!allToolTypes.has(type)) {
            errors.push(`Tool type '${type}' does not exist.`);
          } else {
            // Type exists, now check if tool exists and belongs to that type
            const tool = allTools.find((t: InternalToolDefinition) => t.id === toolId);
            if (!tool) {
              errors.push(`Tool id '${toolId}' does not exist.`);
            } else if (tool.type !== type) {
              errors.push(`Tool id '${toolId}' belongs to type '${tool.type}', not '${type}'.`);
            }
          }
        } else {
          // No tool type specified - check if tool exists globally
          const exists = await toolRegistry.has(toolId);
          if (!exists) {
            errors.push(`Tool id '${toolId}' does not exist.`);
          }
        }
      }
    }
  }
  return errors;
}
