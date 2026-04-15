/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { LRUCache } from 'lru-cache';
import type { ProfilesRepository } from '../repository';
import { ensureGlobalAnonymizationProfile } from './global_profile_initializer';
import { migrateLegacyUiSettingsIntoGlobalProfile } from './legacy_ui_settings_migration';

const ENSURE_GLOBAL_PROFILE_CACHE_MS = 60_000;
const MAX_CACHED_NAMESPACES = 1000;
interface EnsuredNamespaceState {
  lastEnsuredAt: number;
  migratedLegacySettings: boolean;
}

const ensuredStateByNamespace = new LRUCache<string, EnsuredNamespaceState>({
  max: MAX_CACHED_NAMESPACES,
});

const inFlightEnsureByNamespace = new Map<string, Promise<void>>();

const runNamespaceEnsureOnce = async (namespace: string, ensure: () => Promise<void>) => {
  const existing = inFlightEnsureByNamespace.get(namespace);
  if (existing) {
    return existing;
  }

  const inFlight = (async () => {
    try {
      await ensure();
    } finally {
      inFlightEnsureByNamespace.delete(namespace);
    }
  })();

  inFlightEnsureByNamespace.set(namespace, inFlight);
  return inFlight;
};

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
  return runNamespaceEnsureOnce(namespace, async () => {
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
  });
};
