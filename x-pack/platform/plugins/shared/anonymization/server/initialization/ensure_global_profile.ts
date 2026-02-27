/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { ProfilesRepository } from '../repository';
import { ensureGlobalAnonymizationProfile } from './global_profile_initializer';
import { migrateLegacyUiSettingsIntoGlobalProfile } from './legacy_ui_settings_migration';

const ENSURE_GLOBAL_PROFILE_CACHE_MS = 60_000;
const ensuredStateByNamespace = new Map<
  string,
  {
    lastEnsuredAt: number;
    migratedLegacySettings: boolean;
  }
>();

export const ensureGlobalProfileForNamespace = async ({
  namespace,
  profilesRepo,
  logger,
  getLegacySettingsString,
  forceEnsure = false,
}: {
  namespace: string;
  profilesRepo: ProfilesRepository;
  logger: Logger;
  getLegacySettingsString?: () => Promise<string | undefined>;
  forceEnsure?: boolean;
}): Promise<void> => {
  const now = Date.now();
  const currentState = ensuredStateByNamespace.get(namespace);

  if (!currentState?.migratedLegacySettings && getLegacySettingsString) {
    const settingsString = await getLegacySettingsString();
    await ensureGlobalAnonymizationProfile({ namespace, profilesRepo, logger });
    const migratedLegacySettings = await migrateLegacyUiSettingsIntoGlobalProfile({
      namespace,
      settingsString,
      profilesRepo,
      logger,
    });

    ensuredStateByNamespace.set(namespace, {
      lastEnsuredAt: now,
      migratedLegacySettings,
    });
    return;
  }

  if (
    !forceEnsure &&
    currentState &&
    now - currentState.lastEnsuredAt < ENSURE_GLOBAL_PROFILE_CACHE_MS
  ) {
    return;
  }

  await ensureGlobalAnonymizationProfile({
    namespace,
    profilesRepo,
    logger,
  });

  ensuredStateByNamespace.set(namespace, {
    lastEnsuredAt: now,
    migratedLegacySettings: currentState?.migratedLegacySettings ?? false,
  });
};
