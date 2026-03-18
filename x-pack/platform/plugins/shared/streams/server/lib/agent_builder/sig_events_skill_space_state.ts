/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import {
  STREAMS_SIGNIFICANT_EVENTS_SETTINGS_SO_TYPE,
  STREAMS_SIGNIFICANT_EVENTS_SETTINGS_SINGLETON_ID,
  type SigEventsSettingsAttributes,
} from '../saved_objects/significant_events/sig_events_settings_config';

/**
 * Returns true if any space has Sig Events skill enabled in significant-events settings.
 */
export async function isSigEventsSkillEnabledInAnySpace(
  core: CoreStart,
  logger: Logger,
  logPrefix: string
): Promise<boolean> {
  let spaceIds: string[];
  try {
    const spaceRepo = core.savedObjects.createInternalRepository(['space']);
    const { saved_objects: spaceObjects } = await spaceRepo.find({
      type: 'space',
      perPage: 1000,
    });
    spaceIds = spaceObjects.map((so) => so.id);
  } catch (err) {
    logger.warn(`${logPrefix}: could not list spaces: ${(err as Error).message}`);
    return false;
  }

  const internalRepo = core.savedObjects.createInternalRepository();
  for (const spaceId of spaceIds) {
    try {
      const so = await internalRepo.get<SigEventsSettingsAttributes>(
        STREAMS_SIGNIFICANT_EVENTS_SETTINGS_SO_TYPE,
        STREAMS_SIGNIFICANT_EVENTS_SETTINGS_SINGLETON_ID,
        { namespace: spaceId }
      );
      if (so.attributes?.sigEventsSkillEnabled === true) {
        return true;
      }
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
  return false;
}
