/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createBadRequestError } from '@kbn/onechat-common';
import type { ToolSelection } from '@kbn/onechat-common';
import type { KibanaRequest } from '@kbn/core/server';
import type { InternalToolRegistry } from '../../tools/types';

const idRegexp = /^[a-zA-Z][a-zA-Z0-9_-]*$/;

export const ensureValidId = (id: string) => {
  if (!idRegexp.test(id)) {
    throw createBadRequestError(`Invalid profile id: ${id}`);
  }
};

export interface ValidateToolSelectionParams {
  toolRegistry: InternalToolRegistry;
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
  const allProviders = new Set(allTools.map((t: any) => t.meta.providerId));

  for (const selection of toolSelection) {
    const { provider, toolIds } = selection;
    if (!provider) {
      // If provider is not specified, check for ambiguity
      for (const toolId of toolIds) {
        if (toolId === '*') continue;
        const matchingTools = allTools.filter((t: any) => t.id === toolId);
        if (matchingTools.length > 1) {
          const matchingProviders = Array.from(
            new Set(matchingTools.map((t: any) => t.meta.providerId))
          );
          errors.push(
            `Tool id '${toolId}' is ambiguous. Please specify a provider. Matching providers: [${matchingProviders.join(
              ', '
            )}]`
          );
        }
        if (matchingTools.length === 0) {
          errors.push(`Tool id '${toolId}' does not exist in any provider.`);
        }
      }
    } else {
      // Provider specified
      if (!allProviders.has(provider)) {
        errors.push(`Provider '${provider}' does not exist.`);
        continue;
      }
      // Check each tool exists for the provider
      for (const toolId of toolIds) {
        if (toolId === '*') continue;
        const exists = await toolRegistry.has({
          toolId: { toolId, providerId: provider },
          request,
        });
        if (!exists) {
          errors.push(`Tool id '${toolId}' does not exist for provider '${provider}'.`);
        }
      }
    }
  }
  return errors;
}
