/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { ToolSelection } from '@kbn/agent-builder-common';
import type { AgentProfileStorage, AgentProperties } from './client/storage';
import type { AgentRef } from '../../../../common/http_api/tools';
import type { AgentsUsingToolsResult } from './types';
import { updateRequestToEs } from './client/converters';
import { removeToolIdsFromToolSelection } from './client/utils';
import { createSpaceDslFilter } from '../../../utils/spaces';

const SEARCH_SIZE = 1000;

export interface ToolRefCleanupParams {
  storage: AgentProfileStorage;
  spaceId: string;
  toolIds: string[];
  logger?: Logger;
  checkOnly?: boolean;
}

export type ToolRefCleanupRunResult = AgentsUsingToolsResult;

function getToolsFromSource(source: AgentProperties): ToolSelection[] {
  return source.configuration?.tools ?? source.config?.tools ?? [];
}

function referencesToolIds(tools: ToolSelection[], toolIdSet: Set<string>): boolean {
  return tools.some((sel) => (sel.tool_ids ?? []).some((tid) => toolIdSet.has(tid)));
}

function toAgentRef(source: AgentProperties, fallbackId: string): AgentRef {
  const id = String(source.id ?? fallbackId);
  const name = source.name;
  return { id, name };
}

export async function runToolRefCleanup({
  storage,
  spaceId,
  toolIds,
  logger,
  checkOnly = false,
}: ToolRefCleanupParams): Promise<ToolRefCleanupRunResult> {
  const toolIdSet = new Set(toolIds);
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
  const logPrefix = checkOnly ? 'Get agents using tools' : 'Tool ref cleanup';
  if (hits.length >= SEARCH_SIZE && logger) {
    logger.warn(`${logPrefix}: search limit reached (size=${SEARCH_SIZE}, spaceId=${spaceId}).`);
  }

  const agents: AgentRef[] = [];
  const bulkOperations: Array<{ index: { _id: string; document: AgentProperties } }> = [];
  const now = new Date();

  for (const hit of hits) {
    const source = hit._source;
    if (!source) continue;

    const currentTools = getToolsFromSource(source);
    if (!referencesToolIds(currentTools, toolIdSet)) continue;

    agents.push(toAgentRef(source, String(hit._id)));

    if (!checkOnly) {
      const newTools = removeToolIdsFromToolSelection(currentTools, toolIds);
      const updated = updateRequestToEs({
        agentId: source.id ?? hit._id,
        currentProps: source,
        update: { configuration: { tools: newTools } },
        updateDate: now,
      });
      bulkOperations.push({
        index: { _id: String(hit._id), document: updated },
      });
    }
  }

  if (checkOnly) {
    return { agents };
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

  return { agents };
}
