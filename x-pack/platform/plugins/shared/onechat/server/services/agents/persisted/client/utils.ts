/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { allToolsSelectionWildcard } from '@kbn/onechat-common';
import type { ToolSelection } from '@kbn/onechat-common';
import type { KibanaRequest } from '@kbn/core/server';
import type { ToolRegistry } from '../../../tools';

export interface ValidateToolSelectionParams {
  toolRegistry: ToolRegistry;
  request: KibanaRequest;
  toolSelection: ToolSelection[];
  /**
   * If true, automatically filter out tools that don't exist.
   * If false, return errors for non-existent tools (strict validation).
   * Default: false
   */
  autoFilter?: boolean;
}

export interface ValidateToolSelectionResult {
  /**
   * Validation error messages (empty if valid or autoFilter=true)
   */
  errors: string[];
  /**
   * Tool IDs that were filtered out (only when autoFilter=true)
   */
  filteredTools: string[];
  /**
   * Filtered tool selection with only valid tools
   */
  filteredSelection: ToolSelection[];
}

export async function validateToolSelection({
  toolRegistry,
  toolSelection,
  autoFilter = false,
}: ValidateToolSelectionParams): Promise<ValidateToolSelectionResult> {
  const errors: string[] = [];
  const filteredTools: string[] = [];
  const filteredSelection: ToolSelection[] = [];

  for (const selection of toolSelection) {
    const { tool_ids: toolIds } = selection;
    const validToolIds: string[] = [];

    for (const toolId of toolIds) {
      if (toolId === allToolsSelectionWildcard) {
        // Wildcard selection is valid as long as tools exist
        validToolIds.push(toolId);
        continue;
      } else {
        // Specific tool selection - check if tool exists
        const exists = await toolRegistry.has(toolId);
        if (!exists) {
          if (autoFilter) {
            filteredTools.push(toolId);
          } else {
            errors.push(`Tool id '${toolId}' does not exist.`);
          }
        } else {
          validToolIds.push(toolId);
        }
      }
    }

    // Only add selection if it has valid tools
    if (validToolIds.length > 0) {
      filteredSelection.push({ tool_ids: validToolIds });
    }
  }

  return {
    errors,
    filteredTools,
    filteredSelection: autoFilter ? filteredSelection : toolSelection,
  };
}
