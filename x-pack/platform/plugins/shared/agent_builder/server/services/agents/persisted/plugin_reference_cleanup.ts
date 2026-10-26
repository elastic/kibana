/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { AgentProfileStorage, AgentProperties } from './client/storage';
import type { AgentRef } from '../../../../common/http_api/tools';
import type { AgentsUsingToolsResult } from './types';
import { updateRequestToEs } from './client/converters';
import { createSpaceDslFilter } from '../../../utils/spaces';

const SEARCH_SIZE = 1000;

export interface PluginRefCleanupParams {
  storage: AgentProfileStorage;
  spaceId: string;
  pluginIds: string[];
  logger?: Logger;
  checkOnly?: boolean;
}

function getPluginIdsFromSource(source: AgentProperties): string[] {
  return source.configuration?.plugin_ids ?? source.config?.plugin_ids ?? [];
}

function referencesPluginIds(pluginIds: string[], pluginIdSet: Set<string>): boolean {
  return pluginIds.some((id) => pluginIdSet.has(id));
}

function toAgentRef(source: AgentProperties, fallbackId: string): AgentRef {
  const id = String(source.id ?? fallbackId);
  const name = source.name;
  return { id, name };
}

function removePluginIdsFromAgent(
  currentPluginIds: string[],
  pluginIdsToRemove: string[]
): string[] {
  const removeSet = new Set(pluginIdsToRemove);
  return currentPluginIds.filter((id) => !removeSet.has(id));
}

export async function runPluginRefCleanup({
  storage,
  spaceId,
  pluginIds,
  logger,
  checkOnly = false,
}: PluginRefCleanupParams): Promise<AgentsUsingToolsResult> {
  const pluginIdSet = new Set(pluginIds);
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
  const logPrefix = checkOnly ? 'Get agents using plugins' : 'Plugin ref cleanup';
  if (hits.length >= SEARCH_SIZE && logger) {
    logger.warn(`${logPrefix}: search limit reached (size=${SEARCH_SIZE}, spaceId=${spaceId}).`);
  }

  const agents: AgentRef[] = [];
  const bulkOperations: Array<{ index: { _id: string; document: AgentProperties } }> = [];
  const now = new Date();

  for (const hit of hits) {
    const source = hit._source;
    if (!source) continue;

    const currentPluginIds = getPluginIdsFromSource(source);
    if (!referencesPluginIds(currentPluginIds, pluginIdSet)) continue;

    agents.push(toAgentRef(source, String(hit._id)));

    if (!checkOnly) {
      const newPluginIds = removePluginIdsFromAgent(currentPluginIds, pluginIds);
      const updated = updateRequestToEs({
        agentId: source.id ?? hit._id,
        currentProps: source,
        update: { configuration: { plugin_ids: newPluginIds } },
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
        logger.error(`Plugin ref cleanup: bulk update failed. ${message}`);
      }
      throw err;
    }
  }

  return { agents };
}
