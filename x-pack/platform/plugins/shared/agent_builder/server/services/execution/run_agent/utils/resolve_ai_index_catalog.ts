/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { AiIndexDetail, AiIndexResolver } from '@kbn/agent-builder-server';
import { defaultAiIndices } from '../../../agents/default_ai_indices';
import type { AiIndexCatalogEntry } from '../types';

/**
 * Builds the prompt's AI index catalog. Defaults bypass the resolver, so they survive an
 * unreachable or unreadable Context Engine; a resolver failure degrades to bare ids.
 */
export const resolveAiIndexCatalog = async ({
  aiIndices,
  request,
  resolver,
  logger,
}: {
  aiIndices: string[];
  request: KibanaRequest;
  resolver?: AiIndexResolver;
  logger?: Logger;
}): Promise<AiIndexCatalogEntry[]> => {
  const ids = [...new Set(aiIndices)];
  const nonDefaultIds = ids.filter((id) => !Object.hasOwn(defaultAiIndices, id));

  let resolvedById = new Map<string, AiIndexDetail>();
  if (resolver && nonDefaultIds.length > 0) {
    try {
      const details = await resolver({ ids: nonDefaultIds, request });
      resolvedById = new Map(details.map((detail) => [detail.id, detail]));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger?.warn(`Failed to resolve AI index details, rendering ids only: ${message}`);
    }
  }

  return ids.map((id) => {
    if (Object.hasOwn(defaultAiIndices, id)) {
      const defaultEntry = defaultAiIndices[id];
      return {
        id,
        esqlTarget: defaultEntry.esqlTarget,
        description: defaultEntry.description,
      };
    }
    const resolved = resolvedById.get(id);
    if (resolved) {
      return { id, esqlTarget: resolved.esqlTarget, description: resolved.description };
    }
    return { id };
  });
};
