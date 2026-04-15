/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { AgentProfileStorage, AgentProperties } from './client/storage';
import type { AgentRef } from '../../../../common/http_api/skills';
import type { AgentsUsingSkillsResult } from './types';
import { updateRequestToEs } from './client/converters';
import { createSpaceDslFilter } from '../../../utils/spaces';

const SEARCH_SIZE = 1000;

export interface SkillRefCleanupParams {
  storage: AgentProfileStorage;
  spaceId: string;
  skillIds: string[];
  logger?: Logger;
  checkOnly?: boolean;
}

export type SkillRefCleanupRunResult = AgentsUsingSkillsResult;

function getSkillIdsFromSource(source: AgentProperties): string[] {
  return source.config?.skill_ids ?? source.configuration?.skill_ids ?? [];
}

function stripSkillIds(skillIds: string[], removeIds: string[]): string[] {
  const removeSet = new Set(removeIds);
  return skillIds.filter((sid) => !removeSet.has(sid));
}

function toAgentRef(source: AgentProperties, fallbackId: string): AgentRef {
  const id = String(source.id ?? fallbackId);
  const name = source.name;
  return { id, name };
}

export async function runSkillRefCleanup({
  storage,
  spaceId,
  skillIds,
  logger,
  checkOnly = false,
}: SkillRefCleanupParams): Promise<SkillRefCleanupRunResult> {
  if (skillIds.length === 0) {
    return { agents: [] };
  }

  const agents: AgentRef[] = [];
  const bulkOperations: Array<{ index: { _id: string; document: AgentProperties } }> = [];
  const now = new Date();

  const client = storage.getClient();

  const response = await client.search({
    track_total_hits: false,
    size: SEARCH_SIZE,
    query: {
      bool: {
        filter: [createSpaceDslFilter(spaceId), { terms: { 'config.skill_ids': skillIds } }],
      },
    },
  });

  const hits = response.hits.hits;

  for (const hit of hits) {
    const source = hit._source;
    if (!source) continue;

    const currentSkillIds = getSkillIdsFromSource(source);

    agents.push(toAgentRef(source, String(hit._id)));

    if (!checkOnly) {
      const newSkillIds = stripSkillIds(currentSkillIds, skillIds);
      const updated = updateRequestToEs({
        agentId: source.id ?? hit._id,
        currentProps: source,
        update: { configuration: { skill_ids: newSkillIds } },
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
      await client.bulk({
        operations: bulkOperations,
        refresh: 'wait_for',
        throwOnFail: true,
      });
    } catch (err) {
      if (logger) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error(`Skill ref cleanup: bulk update failed. ${message}`);
      }
      throw err;
    }
  }

  return { agents };
}
