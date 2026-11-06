/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';

import type { AgentPendingRestart, FleetServerAgentAction } from '../../../common/types/models';
import {
  AGENT_ACTIONS_INDEX,
  AGENT_ACTIONS_RESULTS_INDEX,
  SO_SEARCH_LIMIT,
} from '../../../common/constants';

/**
 * Returns the latest pending RESTART action per agent. A RESTART action is pending for an agent
 * when it targets the agent, is not expired, is not cancelled and has no result for that agent.
 */
export async function getPendingRestartActions(
  esClient: ElasticsearchClient,
  agentIds: string[]
): Promise<Map<string, AgentPendingRestart>> {
  const pendingRestarts = new Map<string, AgentPendingRestart>();
  if (agentIds.length === 0) {
    return pendingRestarts;
  }

  const requestedAgentIds = new Set(agentIds);
  const actionsRes = await esClient.search<FleetServerAgentAction>({
    index: AGENT_ACTIONS_INDEX,
    ignore_unavailable: true,
    size: SO_SEARCH_LIMIT,
    _source: ['action_id', 'agents', '@timestamp', 'expiration'],
    query: {
      bool: {
        filter: [
          { term: { type: 'RESTART' } },
          { terms: { agents: agentIds } },
          { range: { expiration: { gt: new Date().toISOString() } } },
        ],
      },
    },
  });

  const candidates: Array<{ agentId: string } & AgentPendingRestart> = [];
  for (const hit of actionsRes.hits.hits) {
    const action = hit._source;
    if (!action?.action_id) continue;
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

  const [resultsRes, cancelRes] = await Promise.all([
    esClient.search<{ action_id: string; agent_id: string }>({
      index: AGENT_ACTIONS_RESULTS_INDEX,
      ignore_unavailable: true,
      size: SO_SEARCH_LIMIT,
      _source: ['action_id', 'agent_id'],
      query: {
        bool: {
          filter: [
            { terms: { action_id: candidateActionIds } },
            { terms: { agent_id: candidateAgentIds } },
          ],
        },
      },
    }),
    esClient.search<FleetServerAgentAction>({
      index: AGENT_ACTIONS_INDEX,
      ignore_unavailable: true,
      size: SO_SEARCH_LIMIT,
      _source: ['data'],
      query: {
        bool: {
          filter: [{ term: { type: 'CANCEL' } }, { terms: { agents: candidateAgentIds } }],
        },
      },
    }),
  ]);

  const completed = new Set(
    resultsRes.hits.hits.map((hit) => `${hit._source?.action_id}:${hit._source?.agent_id}`)
  );
  const cancelledActionIds = new Set(
    cancelRes.hits.hits.map((hit) => hit._source?.data?.target_id as string | undefined)
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
