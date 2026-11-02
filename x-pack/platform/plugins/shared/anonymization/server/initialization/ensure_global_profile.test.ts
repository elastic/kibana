/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { ProfilesRepository } from '../repository';
import { ensureGlobalProfileForNamespace } from './ensure_global_profile';
import { ensureGlobalAnonymizationProfile } from './global_profile_initializer';
import { migrateLegacyUiSettingsIntoGlobalProfile } from './legacy_ui_settings_migration';

jest.mock('./global_profile_initializer', () => ({
  ensureGlobalAnonymizationProfile: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('./legacy_ui_settings_migration', () => ({
  migrateLegacyUiSettingsIntoGlobalProfile: jest.fn().mockResolvedValue(true),
}));

describe('ensureGlobalProfileForNamespace', () => {
  const logger = loggingSystemMock.createLogger();
  const profilesRepo = {} as unknown as ProfilesRepository;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('migrates only on first namespace touch and skips repeat work within TTL', async () => {
    const namespace = `test-migrate-once-${Date.now()}`;

    await ensureGlobalProfileForNamespace({
      namespace,
      profilesRepo,
      logger,
      getLegacySettingsString: async () => '{"rules":[]}',
    });

    await ensureGlobalProfileForNamespace({
      namespace,
      profilesRepo,
      logger,
      getLegacySettingsString: async () => '{"rules":[]}',
    });

    expect(ensureGlobalAnonymizationProfile).toHaveBeenCalledTimes(1);
    expect(migrateLegacyUiSettingsIntoGlobalProfile).toHaveBeenCalledTimes(1);
  });

  it('bypasses TTL when forceEnsure is true', async () => {
    const namespace = `test-force-ensure-${Date.now()}`;

    await ensureGlobalProfileForNamespace({
      namespace,
      profilesRepo,
      logger,
      getLegacySettingsString: async () => '{"rules":[]}',
    });

    await ensureGlobalProfileForNamespace({
      namespace,
      profilesRepo,
      logger,
      forceEnsure: true,
    });

    expect(ensureGlobalAnonymizationProfile).toHaveBeenCalledTimes(2);
    expect(migrateLegacyUiSettingsIntoGlobalProfile).toHaveBeenCalledTimes(1);
  });

  it('retries legacy migration on next ensure when migration fails', async () => {
    const namespace = `test-retry-migration-${Date.now()}`;
    (migrateLegacyUiSettingsIntoGlobalProfile as jest.Mock)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);

    await ensureGlobalProfileForNamespace({
      namespace,
      profilesRepo,
      logger,
      getLegacySettingsString: async () => '{"rules":[]}',
    });

    await ensureGlobalProfileForNamespace({
      namespace,
      profilesRepo,
      logger,
      getLegacySettingsString: async () => '{"rules":[]}',
    });

    expect(ensureGlobalAnonymizationProfile).toHaveBeenCalledTimes(2);
    expect(migrateLegacyUiSettingsIntoGlobalProfile).toHaveBeenCalledTimes(2);
  });

  it('deduplicates concurrent ensures in a single node', async () => {
    const namespace = `test-concurrent-ensure-${Date.now()}`;

    await Promise.all([
      ensureGlobalProfileForNamespace({
        namespace,
        profilesRepo,
        logger,
        getLegacySettingsString: async () => '{"rules":[]}',
      }),
      ensureGlobalProfileForNamespace({
        namespace,
        profilesRepo,
        logger,
        getLegacySettingsString: async () => '{"rules":[]}',
      }),
    ]);

    expect(ensureGlobalAnonymizationProfile).toHaveBeenCalledTimes(1);
  });
});
