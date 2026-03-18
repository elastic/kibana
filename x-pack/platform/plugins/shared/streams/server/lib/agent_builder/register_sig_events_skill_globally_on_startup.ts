/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { StreamsServer } from '../../types';
import { createSigEventsSkill } from './skills/sig_events_skill';
import { registerSigEventsTools } from './register_tools';
import { isSigEventsSkillEnabledInAnySpace } from './sig_events_skill_space_state';

/**
 * On Kibana startup, registers the SigEvents skill and tools in the global Agent Builder
 * registry when at least one space has sigEventsSkillEnabled in significant-events settings.
 */
export async function registerSigEventsSkillGloballyOnStartup({
  core,
  server,
  logger,
}: {
  core: CoreStart;
  server: StreamsServer | undefined;
  logger: Logger;
}): Promise<void> {
  if (!server?.agentBuilderSetup || !server?.agentBuilderStart || !server?.getScopedClients) {
    return;
  }

  const logPrefix = 'registerSigEventsSkillGloballyOnStartup';

  const anyEnabled = await isSigEventsSkillEnabledInAnySpace(core, logger, logPrefix);
  if (!anyEnabled) {
    return;
  }

  if (server.agentBuilderSetup) {
    try {
      registerSigEventsTools(server.agentBuilderSetup, server.getScopedClients, server);
    } catch (err) {
      const message = (err as Error).message;
      if (!message.includes('already registered')) {
        throw err;
      }
    }
  }

  try {
    const skill = createSigEventsSkill();
    await server.agentBuilderStart!.skills.register(skill);
    logger.debug(`${logPrefix}: registered SigEvents skill and tools globally.`);
  } catch (err) {
    const message = (err as Error).message;
    if (!message.includes('already registered')) {
      logger.warn(`${logPrefix}: failed to register SigEvents skill: ${message}`, {
        error: err instanceof Error ? err : new Error(String(err)),
      });
    }
  }
}
