/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { StreamsPluginStartDependencies } from '../../types';
import type { StreamsServer } from '../../types';
import {
  STREAMS_SIGNIFICANT_EVENTS_SETTINGS_SO_TYPE,
  STREAMS_SIGNIFICANT_EVENTS_SETTINGS_SINGLETON_ID,
  type SigEventsSettingsAttributes,
} from '../saved_objects/significant_events/sig_events_settings_config';
import { createSigEventsSkill } from './skills/sig_events_skill';
import { registerSigEventsTools } from './register_tools';

/**
 * Restores the SigEvents skill and tools on startup using the internal Kibana user.
 * Resolves spaces and sig-events settings via the internal Saved Objects repository
 * so no user request (and no credentials) is needed. Registers the skill and tools only;
 * the default agent's skill_ids are already persisted, so we do not update the agent.
 */
export async function restoreSigEventsSkillPerSpaceOnStartup({
  core,
  plugins,
  server,
  logger,
}: {
  core: CoreStart;
  plugins: StreamsPluginStartDependencies;
  server: StreamsServer | undefined;
  logger: Logger;
}): Promise<void> {
  if (!server?.agentBuilderSetup || !server?.agentBuilderStart || !server?.getScopedClients) {
    return;
  }

  const logPrefix = 'restoreSigEventsSkillOnStartup';

  let spaceIds: string[];
  try {
    const spaceRepo = core.savedObjects.createInternalRepository(['space']);
    const { saved_objects: spaceObjects } = await spaceRepo.find({
      type: 'space',
      perPage: 1000,
    });
    spaceIds = spaceObjects.map((so) => so.id);
  } catch (err) {
    logger.warn(`${logPrefix}: could not get spaces: ${(err as Error).message}`);
    return;
  }

  const internalRepo = core.savedObjects.createInternalRepository();
  let firstEnabledSettings: { content?: string; toolIds?: string[] } | null = null;

  for (const spaceId of spaceIds) {
    try {
      const so = await internalRepo.get<SigEventsSettingsAttributes>(
        STREAMS_SIGNIFICANT_EVENTS_SETTINGS_SO_TYPE,
        STREAMS_SIGNIFICANT_EVENTS_SETTINGS_SINGLETON_ID,
        { namespace: spaceId }
      );
      const skill = so.attributes?.sigEventsSkill;
      if (!skill?.enabled) {
        continue;
      }
      if (!firstEnabledSettings) {
        firstEnabledSettings = {
          content: skill.content?.trim() || undefined,
          toolIds: skill.toolIds,
        };
      }
      logger.debug(`${logPrefix}: SigEvents skill was enabled in space ${spaceId}`);
    } catch (err) {
      const statusCode =
        (err as { output?: { statusCode?: number }; statusCode?: number })?.output?.statusCode ??
        (err as { statusCode?: number })?.statusCode;
      if (statusCode !== 404) {
        logger.warn(
          `${logPrefix}: failed to read settings for space ${spaceId}: ${(err as Error).message}`
        );
      }
    }
  }

  if (!firstEnabledSettings) {
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
    const skill = createSigEventsSkill(firstEnabledSettings.toolIds, firstEnabledSettings.content);
    await server.agentBuilderStart!.skills.register(skill);
    logger.debug(
      `${logPrefix}: registered SigEvents skill (default agent already has skill_ids persisted).`
    );
  } catch (err) {
    const message = (err as Error).message;
    if (!message.includes('already registered')) {
      logger.warn(`${logPrefix}: failed to register SigEvents skill: ${message}`, {
        error: err instanceof Error ? err : new Error(String(err)),
      });
    }
  }
}
