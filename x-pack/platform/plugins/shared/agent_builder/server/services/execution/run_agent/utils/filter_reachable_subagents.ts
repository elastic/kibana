/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SubagentEntry } from '@kbn/agent-builder-common';

/**
 * Filters a persistent sub-agent tracker snapshot down to entries whose
 * backing `agent_id` is still in the parent agent's resolved allowlist.
 * Sentinel-to-sentinel matches naturally by exact-string comparison.
 */
export const filterReachableSubagents = ({
  entries,
  allowedIds,
}: {
  entries: Record<string, SubagentEntry>;
  allowedIds: Set<string>;
}): Record<string, SubagentEntry> => {
  const out: Record<string, SubagentEntry> = {};
  for (const [name, entry] of Object.entries(entries)) {
    if (allowedIds.has(entry.agent_id)) {
      out[name] = entry;
    }
  }
  return out;
};
