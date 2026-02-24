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

export const ensureAndMigrateGlobalProfile = async ({
  namespace,
  profilesRepo,
  logger,
  settingsString,
}: {
  namespace: string;
  profilesRepo: ProfilesRepository;
  logger: Logger;
  settingsString?: string;
}): Promise<void> => {
  await ensureGlobalAnonymizationProfile({
    namespace,
    profilesRepo,
    logger,
  });

  await migrateLegacyUiSettingsIntoGlobalProfile({
    namespace,
    settingsString,
    profilesRepo,
    logger,
  });
};
