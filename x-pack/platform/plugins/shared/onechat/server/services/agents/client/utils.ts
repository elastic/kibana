/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { allToolsSelectionWildcard, createBadRequestError } from '@kbn/onechat-common';
import type { ToolSelection } from '@kbn/onechat-common';
import type { KibanaRequest } from '@kbn/core/server';
import type { ToolRegistry } from '../../tools';

// - Must start and end with letter or digit
// - Can contain letters, digits, hyphens, underscores
const idRegexp = /^[a-z0-9](?:[a-z0-9_-]*[a-z0-9])?$/;

export const ensureValidId = (id: string) => {
  if (!idRegexp.test(id)) {
    throw createBadRequestError(`Invalid agent id: ${id}`);
  }
};

export interface ValidateToolSelectionParams {
  toolRegistry: ToolRegistry;
  request: KibanaRequest;
  toolSelection: ToolSelection;
}

export async function validateToolSelection({
  toolRegistry,
  toolSelection,
}: ValidateToolSelectionParams): Promise<string[]> {
  const errors: string[] = [];

  const { tool_ids: toolIds } = toolSelection;

  for (const toolId of toolIds) {
    if (toolId === allToolsSelectionWildcard) {
      // Wildcard selection is valid as long as tools exist
      continue;
    } else {
      // Specific tool selection - check if tool exists
      const exists = await toolRegistry.has(toolId);
      if (!exists) {
        errors.push(`Tool id '${toolId}' does not exist.`);
      }
    }
  }
  return errors;
}
