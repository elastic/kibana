/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { ShortTermMemory } from '@kbn/agent-builder-common';
import {
  ShortTermMemoryIdentityError,
  type ScopedShortTermMemoryClient,
} from '@kbn/agent-builder-server';
import { PROMPT_SHORT_TERM_MEMORY_LIMIT } from '../prompts/utils/memory';

/**
 * The user's most recent memories with this agent, for the MEMORY prompt section. `undefined`
 * leaves the section out: when the caller has no stable identity, or the read fails, the run goes
 * on without memory rather than failing.
 */
export const loadRecentShortTermMemories = async ({
  getClient,
  agentId,
  logger,
}: {
  getClient?: () => Promise<ScopedShortTermMemoryClient>;
  agentId?: string;
  logger: Logger;
}): Promise<ShortTermMemory[] | undefined> => {
  if (!getClient || !agentId) {
    return undefined;
  }
  try {
    const client = await getClient();
    const memories = await client.list({ agentId, limit: PROMPT_SHORT_TERM_MEMORY_LIMIT });
    // Shown to the agent counts as used. Recording it must not delay or fail the run.
    client.markUsed(memories).catch((error) => {
      logger.debug(
        `Failed to record short-term memory use: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    });
    return memories;
  } catch (error) {
    if (error instanceof ShortTermMemoryIdentityError) {
      logger.debug('Short-term memory skipped: the caller has no stable user identity');
      return undefined;
    }
    logger.warn(
      `Failed to load short-term memories: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return undefined;
  }
};
