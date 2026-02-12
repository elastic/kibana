/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { AgentProfileStorage } from './client/storage';
import type { ToolRefCleanupResult } from './types';
import { updateRequestToEs } from './client/converters';
import { removeToolIdsFromToolSelection } from './client/utils';
import { createSpaceDslFilter } from '../../../utils/spaces';

const SEARCH_SIZE = 1000;

export interface ToolRefCleanupParams {
  storage: AgentProfileStorage;
  spaceId: string;
  toolIds: string[];
  logger?: Logger;
}

export async function runToolRefCleanup({
  storage,
  spaceId,
  toolIds,
  logger,
}: ToolRefCleanupParams): Promise<ToolRefCleanupResult> {
  const idsSet = new Set(toolIds);
  const response = await storage.getClient().search({
    track_total_hits: false,
    size: SEARCH_SIZE,
    query: {
      bool: {
        filter: [createSpaceDslFilter(spaceId)],
      },
    },
  });

  const hits = response.hits.hits;
  if (hits.length >= SEARCH_SIZE && logger) {
    logger.warn(
      `Tool ref cleanup: search limit reached (size=${SEARCH_SIZE}, spaceId=${spaceId}). Some agents may still reference the deleted tool(s).`
    );
  }
  const bulkOperations = [];

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

    bulkOperations.push({
      index: { _id: String(hit._id), document: updated },
    });
  }

  if (bulkOperations.length > 0) {
    try {
      await storage.getClient().bulk({
        operations: bulkOperations,
        refresh: 'wait_for',
        throwOnFail: true,
      });
    } catch (err) {
      if (logger) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error(`Tool ref cleanup: bulk update failed. ${message}`);
      }
      throw err;
    }
  }

  return { agentsUpdated: bulkOperations.length };
}
