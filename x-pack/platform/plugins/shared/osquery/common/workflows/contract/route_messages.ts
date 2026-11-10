/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Messages of the live-query route's 400s that the workflow step maps to error codes. */
export const NO_AGENTS_FOUND_MESSAGE = 'No agents found for selection';

/**
 * Machine-readable codes the live-query route returns in `attributes.code` of those 400s. The step
 * maps on the code, so rewording a message cannot change the mapping.
 */
export const RouteErrorCode = {
  NO_AGENTS_FOUND: 'NO_AGENTS_FOUND',
  AGENT_LIMIT_EXCEEDED: 'AGENT_LIMIT_EXCEEDED',
} as const;

export const agentLimitMessage = (total: number, limit: number): string =>
  `The selection matches ${total} agents, above the limit of ${limit}. Narrow it down.`;
