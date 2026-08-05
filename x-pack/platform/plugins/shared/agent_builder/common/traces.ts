/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Prefix shared by every Agent Builder OTel traces data stream, per-agent or otherwise. */
export const TRACES_INDEX_PREFIX = 'traces-agent_builder.otel-';

export interface AgentBuilderTracesNamespaceParams {
  spaceId: string;
  agentId?: string;
}

/**
 * Builds the data-stream namespace segment routing a single agent's traces: `<spaceId>.<agentId>`.
 *
 * When the agent can't be resolved, falls back to the space id alone so the trace still stays
 * scoped to the space — it must never fall through to the exporter's global `default` namespace,
 * which would leak data across spaces.
 */
export const buildAgentBuilderTracesNamespace = ({
  spaceId,
  agentId,
}: AgentBuilderTracesNamespaceParams): string => {
  return agentId ? `${spaceId}.${agentId}` : spaceId;
};

/**
 * Builds the namespace wildcard covering every agent's stream within a space: `<spaceId>.*`.
 */
export const buildAgentBuilderTracesNamespacePattern = (spaceId: string): string => {
  return `${spaceId}.*`;
};

/**
 * Builds the concrete per-agent traces data-stream name:
 * `traces-agent_builder.otel-<spaceId>.<agentId>`.
 */
export const buildAgentBuilderTracesIndexName = ({
  spaceId,
  agentId,
}: AgentBuilderTracesNamespaceParams): string => {
  return `${TRACES_INDEX_PREFIX}${buildAgentBuilderTracesNamespace({ spaceId, agentId })}`;
};

/**
 * Builds the per-space index pattern covering every agent's traces stream within a space:
 * `traces-agent_builder.otel-<spaceId>.*`.
 *
 * Use this for reading/querying (dashboards, the traces skill, trace-exists checks). Never
 * broaden further to `traces-agent_builder.otel-*` — that would mix data across spaces.
 */
export const buildAgentBuilderTracesIndexPattern = (spaceId: string): string => {
  return `${TRACES_INDEX_PREFIX}${buildAgentBuilderTracesNamespacePattern(spaceId)}`;
};
