/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import { AESOP_AGENTS } from './agent_definitions';

export async function ensureAesopAgents(
  agentRegistry: any,
  logger: Logger
): Promise<Map<string, boolean>> {
  const results = new Map<string, boolean>();

  for (const agentDef of AESOP_AGENTS) {
    try {
      const exists = await agentRegistry.has(agentDef.id);
      if (exists) {
        logger.debug(`[AESOP] Agent ${agentDef.id} already exists`);
        results.set(agentDef.id, true);
        continue;
      }

      await agentRegistry.create({
        id: agentDef.id,
        name: agentDef.name,
        description: agentDef.description,
        type: 'chat',
        configuration: {
          instructions: agentDef.instructions,
          tools: [{ tool_ids: agentDef.toolIds }],
        },
        labels: ['aesop', 'auto-created'],
      });

      logger.info(`[AESOP] Created agent: ${agentDef.id}`);
      results.set(agentDef.id, true);
    } catch (error) {
      logger.warn(
        `[AESOP] Failed to create agent ${agentDef.id}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      results.set(agentDef.id, false);
    }
  }

  return results;
}
