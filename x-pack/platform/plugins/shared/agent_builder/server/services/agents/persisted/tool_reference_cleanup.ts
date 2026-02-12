/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentProfileStorage, AgentProperties } from './client/storage';
import { updateRequestToEs } from './client/converters';
import { removeToolIdsFromToolSelection } from './client/utils';
import { createSpaceDslFilter } from '../../../utils/spaces';

export interface RunToolReferenceCleanupParams {
  storage: AgentProfileStorage;
  spaceId: string;
  toolIds: string[];
}

export interface RunToolReferenceCleanupResult {
  agentsUpdated: number;
}

export async function runToolReferenceCleanup({
  storage,
  spaceId,
  toolIds,
}: RunToolReferenceCleanupParams): Promise<RunToolReferenceCleanupResult> {
  const idsSet = new Set(toolIds);
  const response = await storage.getClient().search({
    track_total_hits: false,
    size: 1000,
    query: {
      bool: {
        filter: [createSpaceDslFilter(spaceId)],
      },
    },
  });

  let agentsUpdated = 0;
  const hits = response.hits.hits as Array<{ _id: string; _source?: AgentProperties }>;

  for (const hit of hits) {
    const source = hit._source;
    if (!source) continue;

    const currentTools = source.configuration?.tools ?? source.config?.tools ?? [];
    const referencesTool = currentTools.some((sel) =>
      (sel.tool_ids ?? []).some((tid) => idsSet.has(tid))
    );
    if (!referencesTool) continue;

    const newTools = removeToolIdsFromToolSelection(currentTools, toolIds);
    const agentId = source.id ?? hit._id;
    const updated = updateRequestToEs({
      agentId,
      currentProps: source,
      update: { configuration: { tools: newTools } },
      updateDate: new Date(),
    });

    await storage.getClient().index({
      id: hit._id,
      document: updated,
    });
    agentsUpdated += 1;
  }

  return { agentsUpdated };
}
