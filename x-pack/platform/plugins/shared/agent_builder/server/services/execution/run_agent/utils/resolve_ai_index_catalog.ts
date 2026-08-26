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
 * Builds the AI index catalog rendered in the system prompt, one entry per configured id
 * in config order (deduped). For each id: the static default map wins (it carries curated
 * guidance); otherwise the resolver's details are used (name = the `FROM` target,
 * description from the registry); ids the resolver doesn't know — or all non-default ids
 * when no resolver is registered or the caller may not read the registry — degrade to a
 * nameless entry, which the prompt keeps out of its "Available to this agent" list (the
 * id is not a valid `FROM` target).
 *
 * The resolver is called at most once, only for non-default ids, and on behalf of the
 * request's user. Resolver failures are swallowed (degrading to nameless entries) so a
 * Context Engine hiccup never breaks a run.
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
        name: defaultEntry.name,
        description: defaultEntry.description,
        guidance: defaultEntry.guidance,
      };
    }
    const resolved = resolvedById.get(id);
    if (resolved) {
      return { id, name: resolved.name, description: resolved.description };
    }
    return { id };
  });
};
