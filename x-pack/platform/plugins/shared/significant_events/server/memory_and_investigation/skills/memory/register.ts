/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import type { Logger } from '@kbn/core/server';
import type { MemoryToolsOptions } from '../../tools/memory';
import { createSignificantEventsMemorySkill } from './significant_events_memory_skill';
import { createMemorySynthesisSkill } from './memory_synthesis_skill';
import { createMemoryConsolidationSkill } from './memory_consolidation_skill';
import { createConversationScraperSkill } from './conversation_scraper_skill';

const MEMORY_SKILL_FACTORIES = [
  { id: 'significant-events-memory', create: createSignificantEventsMemorySkill },
  { id: 'streams-memory-synthesis', create: createMemorySynthesisSkill },
  { id: 'streams-memory-consolidation', create: createMemoryConsolidationSkill },
  { id: 'streams-conversation-scraper', create: createConversationScraperSkill },
] as const;

export const registerStreamsMemoryAgentBuilder = async ({
  agentBuilder,
  memoryToolsOptions,
  logger,
  isAvailable,
}: {
  agentBuilder: AgentBuilderPluginStart;
  memoryToolsOptions: MemoryToolsOptions;
  logger: Logger;
  isAvailable: () => Promise<boolean>;
}): Promise<{
  ensureRegistered: () => Promise<void>;
}> => {
  const registeredSkillIds = new Set<string>();

  // Registers only the skills not registered yet. Already-registered skills are skipped (a second
  // register() call throws), so this is safe to call repeatedly and after a partial failure.
  const registerSkills = async (): Promise<void> => {
    const pending = MEMORY_SKILL_FACTORIES.filter(({ id }) => !registeredSkillIds.has(id));
    if (pending.length === 0) {
      return;
    }

    const results = await Promise.allSettled(
      pending.map(({ create }) => agentBuilder.skills.register(create(memoryToolsOptions)))
    );

    const registered: string[] = [];
    const failed: string[] = [];
    results.forEach((result, index) => {
      const { id } = pending[index];
      if (result.status === 'fulfilled') {
        registeredSkillIds.add(id);
        registered.push(id);
      } else {
        failed.push(id);
        logger.error(
          `Failed to register streams memory skill "${id}": ${
            result.reason instanceof Error ? result.reason.message : String(result.reason)
          }`
        );
      }
    });

    if (failed.length === 0) {
      logger.info(
        'Streams memory skills registered (streams.significantEventsAvailable is enabled)'
      );
    } else {
      logger.warn(
        `Streams memory skills partially registered (${registered.length}/${pending.length}). ` +
          `Registered: [${registered.join(', ')}]. Failed: [${failed.join(
            ', '
          )}]. Will retry on the next flag change.`
      );
    }
  };

  const doEnsureMemorySkillsRegistered = async (): Promise<void> => {
    if (!(await isAvailable())) {
      return;
    }
    await registerSkills();
  };

  // Serialize invocations: the availability flip can fire while a prior run is in flight, and
  // registering the same skill twice throws.
  let queue: Promise<void> = Promise.resolve();
  const ensureMemorySkillsRegistered = (): Promise<void> => {
    queue = queue.catch(() => {}).then(doEnsureMemorySkillsRegistered);
    return queue;
  };

  await ensureMemorySkillsRegistered();

  return {
    ensureRegistered: ensureMemorySkillsRegistered,
  };
};
