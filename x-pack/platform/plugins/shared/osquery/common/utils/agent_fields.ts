/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';

/**
 * Extracts agent ID from Elasticsearch search hit fields.
 * Handles both ECS formatted ['agent.id'] and legacy (agent_id) field formats.
 *
 * @param fields - The fields object from an Elasticsearch SearchHit
 * @returns The agent ID string if found, undefined otherwise
 *
 * @example
 * ```typescript
 * const agentId = getAgentIdFromFields(searchHit.fields);
 * ```
 */
export const getAgentIdFromFields = (fields?: estypes.SearchHit['fields']): string | undefined => {
  if (!fields) return undefined;

  // Check ECS format first (preferred), then fall back to legacy format
  return (fields['agent.id']?.[0] as string) ?? (fields.agent_id?.[0] as string);
};

/**
 * Extracts the agent hostname from Elasticsearch search hit fields.
 * Only documents written to the action responses data stream carry these ECS
 * fields; the legacy dotted index has neither, so callers still need their own
 * fallback for those hits.
 *
 * @param fields - The fields object from an Elasticsearch SearchHit
 * @returns The agent hostname if found, undefined otherwise
 */
export const getAgentNameFromFields = (
  fields?: estypes.SearchHit['fields']
): string | undefined => {
  if (!fields) return undefined;

  return (fields['agent.name']?.[0] as string) ?? (fields['host.name']?.[0] as string);
};
