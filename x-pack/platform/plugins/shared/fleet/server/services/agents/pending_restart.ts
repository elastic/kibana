/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chunk } from 'lodash';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';

import type { AgentPendingRestart, FleetServerAgentAction } from '../../../common/types/models';
import {
  AGENT_ACTIONS_INDEX,
  AGENT_ACTIONS_RESULTS_INDEX,
  SO_SEARCH_LIMIT,
} from '../../../common/constants';
import { createEsSearchIterable } from '../utils/create_es_search_iterable';

// Keeps each `terms` filter well below the default `index.max_terms_count` (65,536).
const ACTION_IDS_CHUNK_SIZE = 10000;

/**
 * Returns the `_source` of every matching document. A single search covers the common case;
 * when it fills a page, the search is repeated with a point in time to page through all hits.
 */
async function searchAllSources<T>(
  esClient: ElasticsearchClient,
  index: string,
  query: QueryDslQueryContainer,
  source: string[]
): Promise<T[]> {
  const res = await esClient.search<T>({
    index,
    ignore_unavailable: true,
    size: SO_SEARCH_LIMIT,
    _source: source,
    query,
  });
  if (res.hits.hits.length < SO_SEARCH_LIMIT) {
    return res.hits.hits.flatMap((hit) => (hit._source ? [hit._source] : []));
  }

  const sources: T[] = [];
  for await (const page of createEsSearchIterable<T>({
    esClient,
    searchRequest: { index, size: SO_SEARCH_LIMIT, sort: ['_shard_doc'], _source: source, query },
  })) {
    for (const hit of page.hits.hits) {
      if (hit._source) sources.push(hit._source);
    }
  }
  return sources;
}

/**
 * Returns the latest pending RESTART action per agent. A RESTART action is pending for an agent
 * when it targets the agent, is not expired, is not cancelled and has no result for that agent.
 * `excludeActionId` ignores the given action, e.g. the bulk action whose batch is being processed.
 */
export async function getPendingRestartActions(
  esClient: ElasticsearchClient,
  agentIds: string[],
  options: { excludeActionId?: string } = {}
): Promise<Map<string, AgentPendingRestart>> {
  const pendingRestarts = new Map<string, AgentPendingRestart>();
  if (agentIds.length === 0) {
    return pendingRestarts;
  }

  const requestedAgentIds = new Set(agentIds);
  const actions = await searchAllSources<FleetServerAgentAction>(
    esClient,
    AGENT_ACTIONS_INDEX,
    {
      bool: {
        filter: [
          { term: { type: 'RESTART' } },
          { terms: { agents: agentIds } },
          { range: { expiration: { gt: new Date().toISOString() } } },
        ],
        ...(options.excludeActionId
          ? { must_not: [{ term: { action_id: options.excludeActionId } }] }
          : {}),
      },
    },
    ['action_id', 'agents', '@timestamp', 'expiration']
  );

  const candidates: Array<{ agentId: string } & AgentPendingRestart> = [];
  for (const action of actions) {
    if (!action.action_id) continue;
    for (const agentId of action.agents ?? []) {
      if (requestedAgentIds.has(agentId)) {
        candidates.push({
          agentId,
          action_id: action.action_id,
          created_at: action['@timestamp'] ?? '',
          expiration: action.expiration,
        });
      }
    }
  }
  if (candidates.length === 0) {
    return pendingRestarts;
  }

  const candidateActionIds = [...new Set(candidates.map(({ action_id: id }) => id))];
  const candidateAgentIds = [...new Set(candidates.map(({ agentId }) => agentId))];

  const getResults = async () => {
    let results: Array<{ action_id: string; agent_id: string }> = [];
    for (const actionIds of chunk(candidateActionIds, ACTION_IDS_CHUNK_SIZE)) {
      results = results.concat(
        await searchAllSources<{ action_id: string; agent_id: string }>(
          esClient,
          AGENT_ACTIONS_RESULTS_INDEX,
          {
            bool: {
              filter: [
                { terms: { action_id: actionIds } },
                { terms: { agent_id: candidateAgentIds } },
              ],
            },
          },
          ['action_id', 'agent_id']
        )
      );
    }
    return results;
  };

  const [results, cancelActions] = await Promise.all([
    getResults(),
    searchAllSources<FleetServerAgentAction>(
      esClient,
      AGENT_ACTIONS_INDEX,
      {
        bool: { filter: [{ term: { type: 'CANCEL' } }, { terms: { agents: candidateAgentIds } }] },
      },
      ['data']
    ),
  ]);

  const completed = new Set(results.map((result) => `${result.action_id}:${result.agent_id}`));
  const cancelledActionIds = new Set(
    cancelActions.map((action) => action.data?.target_id as string | undefined)
  );

  for (const { agentId, ...pendingRestart } of candidates) {
    if (
      completed.has(`${pendingRestart.action_id}:${agentId}`) ||
      cancelledActionIds.has(pendingRestart.action_id)
    ) {
      continue;
    }
    const existing = pendingRestarts.get(agentId);
    if (!existing || existing.created_at < pendingRestart.created_at) {
      pendingRestarts.set(agentId, pendingRestart);
    }
  }

  return pendingRestarts;
}
