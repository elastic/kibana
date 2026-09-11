/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pLimit from 'p-limit';
import type { Logger } from '@kbn/logging';
import { SELF_AGENT_ID } from '@kbn/agent-builder-common';

/**
 * One entry in a resolved `subagent_ids` allowlist. `id` is either a real
 * agent id or the `SELF_AGENT_ID` sentinel; the sentinel stays as-is through
 * the tool schema and is only substituted at the executor call seam.
 */
export interface ResolvedSubagent {
  id: string;
  description: string;
}

const SELF_DESCRIPTION = 'This agent (self-fork).';
const NO_DESCRIPTION = '(no description)';
const CONCURRENCY = 5;

/**
 * Minimal shape needed from the agent registry — accepts anything with a
 * `.get(id)` that resolves to a definition (or throws on missing/denied).
 * Kept intentionally narrow so tests can supply a plain object.
 */
export interface SubagentRegistryLookup {
  get: (id: string) => Promise<{ description?: string } | undefined>;
}

/**
 * Resolves a persisted `configuration.subagent_ids` list against the current
 * user's access:
 *   - `_self` passes through untouched with a fixed description; no registry
 *     lookup is performed for it.
 *   - Real ids are fetched via `agentRegistry.get(id)` in parallel with
 *     bounded concurrency. Ids that don't exist, are denied by access
 *     control, or fail to deserialize are silently dropped (a debug log is
 *     emitted). This mirrors how the UI hides agents the current user
 *     cannot see, and avoids leaking existence of hidden agents into the
 *     LLM's tool schema.
 *   - Persisted order is preserved (with duplicates deduped defensively).
 */
export const resolveAllowedSubagents = async ({
  configuredIds,
  agentRegistry,
  logger,
}: {
  configuredIds: string[];
  agentRegistry: SubagentRegistryLookup;
  logger?: Logger;
}): Promise<ResolvedSubagent[]> => {
  const deduped: string[] = [];
  const seen = new Set<string>();
  for (const id of configuredIds) {
    if (seen.has(id)) continue;
    seen.add(id);
    deduped.push(id);
  }
  if (deduped.length === 0) {
    return [];
  }

  const limit = pLimit(CONCURRENCY);

  const results = await Promise.all(
    deduped.map((id) =>
      limit(async (): Promise<ResolvedSubagent | undefined> => {
        if (id === SELF_AGENT_ID) {
          return { id: SELF_AGENT_ID, description: SELF_DESCRIPTION };
        }
        try {
          const def = await agentRegistry.get(id);
          if (!def) {
            logger?.debug(`resolveAllowedSubagents: dropping "${id}" (not found)`);
            return undefined;
          }
          return { id, description: def.description ?? NO_DESCRIPTION };
        } catch (err) {
          logger?.debug(
            `resolveAllowedSubagents: dropping "${id}" (${
              err instanceof Error ? err.message : String(err)
            })`
          );
          return undefined;
        }
      })
    )
  );

  return results.filter((r): r is ResolvedSubagent => r !== undefined);
};
