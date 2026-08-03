/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const TRACES_INDEX_PREFIX = 'traces-agent_builder.otel-';

/**
 * Data stream namespace for a single agent's traces, so that each agent writes to its
 * own data stream while staying isolated per space.
 *
 * Space ids cannot contain dots (see `SPACE_ID_REGEX` in the spaces plugin) whereas
 * agent ids can, so the first dot unambiguously separates the two segments.
 */
export const buildAgentBuilderTracesNamespace = ({
  spaceId,
  agentId,
}: {
  spaceId: string;
  agentId: string;
}): string => {
  return `${spaceId}.${agentId}`;
};

/**
 * Namespace pattern matching every agent's traces within a space.
 *
 * The separating dot matters: a bare `${spaceId}*` would also match sibling spaces
 * whose id extends this one (`default` would pull in `default-2`).
 */
export const buildAgentBuilderTracesNamespacePattern = (spaceId: string): string => {
  return `${spaceId}.*`;
};

/** Data stream a single agent's traces are written to. */
export const buildAgentBuilderTracesIndexName = ({
  spaceId,
  agentId,
}: {
  spaceId: string;
  agentId: string;
}): string => {
  return `${TRACES_INDEX_PREFIX}${buildAgentBuilderTracesNamespace({ spaceId, agentId })}`;
};

/** Read pattern covering every agent's traces within a space. */
export const buildAgentBuilderTracesIndexPattern = (spaceId: string): string => {
  return `${TRACES_INDEX_PREFIX}${buildAgentBuilderTracesNamespacePattern(spaceId)}`;
};
