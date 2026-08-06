/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Prefix shared by every Agent Builder OTel traces data stream, per-agent or otherwise.
 *
 * Mirrors the OTel exporter's implicit `traces-<dataset>.otel-` naming (dataset = `agent_builder`):
 * the write path sets only `data_stream.dataset` / `data_stream.namespace` and the exporter
 * assembles the final stream name, so this read-side prefix must stay in sync with that convention.
 */
export const TRACES_INDEX_PREFIX = 'traces-agent_builder.otel-';

/**
 * Namespace segment used when a span's agent can't be resolved. It keeps the fallback write both
 * inside the space AND under the `<spaceId>.*` read pattern — a bare `<spaceId>` namespace would be
 * written but never read back (the read pattern requires a trailing `.<segment>`). Not a real agent
 * id; chosen so it can never collide with a resolved agent that carries a `gen_ai.agent.id`.
 */
export const UNRESOLVED_AGENT_NAMESPACE_SEGMENT = '_unresolved';

export interface AgentBuilderTracesNamespaceParams {
  spaceId: string;
  agentId?: string;
}

/**
 * Builds the data-stream namespace segment routing a single agent's traces: `<spaceId>.<agentId>`.
 *
 * When the agent can't be resolved, falls back to `<spaceId>.${UNRESOLVED_AGENT_NAMESPACE_SEGMENT}`.
 * This stays scoped to the space and is still matched by the `<spaceId>.*` read pattern, so the
 * trace remains readable. It must never fall through to the exporter's global `default` namespace
 * (which would leak across spaces), and must never be a bare `<spaceId>` (which no read surface
 * matches — see {@link buildAgentBuilderTracesIndexPattern}).
 */
export const buildAgentBuilderTracesNamespace = ({
  spaceId,
  agentId,
}: AgentBuilderTracesNamespaceParams): string => {
  return `${spaceId}.${agentId || UNRESOLVED_AGENT_NAMESPACE_SEGMENT}`;
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
 *
 * Omitting `agentId` yields the unresolved-agent fallback stream
 * (`...-<spaceId>.${UNRESOLVED_AGENT_NAMESPACE_SEGMENT}`), not a bare per-space stream — prefer
 * always passing a resolved `agentId`.
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
 * Use this for reading/querying (dashboards, the traces skill, trace-exists checks) — it is a read
 * pattern, never a write target. Never broaden further to `traces-agent_builder.otel-*` — that would
 * mix data across spaces.
 */
export const buildAgentBuilderTracesIndexPattern = (spaceId: string): string => {
  return `${TRACES_INDEX_PREFIX}${buildAgentBuilderTracesNamespacePattern(spaceId)}`;
};
