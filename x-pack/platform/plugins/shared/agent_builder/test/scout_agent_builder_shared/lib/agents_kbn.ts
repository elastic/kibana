/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient } from '@kbn/kbn-client';
import type { AgentAccessControlMode } from '@kbn/agent-builder-common';

import { AGENT_BUILDER_PUBLIC_API_HEADERS } from './kbn_public_api_headers';

/** Deletes only the given agent ids. Missing ids are ignored. */
export async function deleteAgentsByIds(
  kbnClient: KbnClient,
  agentIds: readonly string[]
): Promise<void> {
  await Promise.allSettled(
    agentIds.map((agentId) =>
      kbnClient.request({
        method: 'DELETE',
        path: `/api/agent_builder/agents/${encodeURIComponent(agentId)}`,
        headers: { ...AGENT_BUILDER_PUBLIC_API_HEADERS },
        ignoreErrors: [404],
      })
    )
  );
}

export async function createAgentViaKbn(
  kbnClient: KbnClient,
  agent: {
    id: string;
    name: string;
    description?: string;
    labels?: string[];
    accessMode?: AgentAccessControlMode;
  }
): Promise<void> {
  await kbnClient.request({
    method: 'DELETE',
    path: `/api/agent_builder/agents/${encodeURIComponent(agent.id)}`,
    headers: { ...AGENT_BUILDER_PUBLIC_API_HEADERS },
    ignoreErrors: [404],
  });

  await kbnClient.request({
    method: 'POST',
    path: '/api/agent_builder/agents',
    headers: { ...AGENT_BUILDER_PUBLIC_API_HEADERS },
    body: {
      id: agent.id,
      name: agent.name,
      description: agent.description ?? `Agent for testing ${agent.id}`,
      labels: agent.labels ?? [],
      ...(agent.accessMode ? { access_control: { access_mode: agent.accessMode } } : {}),
      configuration: {
        instructions: 'Run this agent',
        tools: [{ tool_ids: ['*'] }],
      },
    },
  });
}

export async function deleteAgentViaKbn(kbnClient: KbnClient, agentId: string): Promise<void> {
  await kbnClient.request({
    method: 'DELETE',
    path: `/api/agent_builder/agents/${encodeURIComponent(agentId)}`,
    headers: { ...AGENT_BUILDER_PUBLIC_API_HEADERS },
  });
}
