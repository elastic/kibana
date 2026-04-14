/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient } from '@kbn/kbn-client';
import type { EsClient } from '@kbn/scout';

const XSFR = { 'kbn-xsrf': 'scout-agent-builder' };

export async function deleteAllAgentsFromEs(
  esClient: EsClient,
  agentsIndex: string
): Promise<void> {
  await esClient.deleteByQuery({
    index: agentsIndex,
    query: { match_all: {} },
    wait_for_completion: true,
    refresh: true,
    conflicts: 'proceed',
    ignore_unavailable: true,
  });
}

export async function createAgentViaKbn(
  kbnClient: KbnClient,
  agent: {
    id: string;
    name: string;
    description?: string;
    labels?: string[];
  }
): Promise<void> {
  await kbnClient.request({
    method: 'POST',
    path: '/api/agent_builder/agents',
    headers: XSFR,
    body: {
      id: agent.id,
      name: agent.name,
      description: agent.description ?? `Agent for testing ${agent.id}`,
      labels: agent.labels ?? [],
      configuration: {
        instructions: 'Run this agent',
        tools: [{ tool_ids: [] }],
      },
    },
  });
}

export async function deleteAgentViaKbn(kbnClient: KbnClient, agentId: string): Promise<void> {
  await kbnClient.request({
    method: 'DELETE',
    path: `/api/agent_builder/agents/${encodeURIComponent(agentId)}`,
    headers: XSFR,
  });
}
