/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';
import {
  STREAMS_SIGNIFICANT_EVENTS_SETTINGS_SO_TYPE,
  STREAMS_SIGNIFICANT_EVENTS_SETTINGS_SINGLETON_ID,
  type SigEventsSettingsAttributes,
} from '../saved_objects/significant_events/sig_events_settings_config';

/**
 * Reads whether the Sig Events skill is enabled from the Default space's significant-events settings.
 */
export async function isSigEventsSkillEnabledInDefaultSpace(
  core: CoreStart,
  logger: Logger,
  logPrefix: string
): Promise<boolean> {
  const internalRepo = core.savedObjects.createInternalRepository();
  try {
    const so = await internalRepo.get<SigEventsSettingsAttributes>(
      STREAMS_SIGNIFICANT_EVENTS_SETTINGS_SO_TYPE,
      STREAMS_SIGNIFICANT_EVENTS_SETTINGS_SINGLETON_ID,
      { namespace: DEFAULT_SPACE_ID }
    );
    return so.attributes?.sigEventsSkillEnabled === true;
  } catch (err) {
    const statusCode =
      (err as { output?: { statusCode?: number }; statusCode?: number })?.output?.statusCode ??
      (err as { statusCode?: number })?.statusCode;
    if (statusCode === 404) {
      return false;
    }
    logger.warn(`${logPrefix}: failed to read default space settings: ${(err as Error).message}`);
    return false;
  }
}
