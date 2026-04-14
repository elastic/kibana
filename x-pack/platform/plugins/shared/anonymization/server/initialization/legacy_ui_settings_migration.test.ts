/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  extractEnabledLegacyRules,
  migrateLegacyUiSettingsIntoGlobalProfile,
} from './legacy_ui_settings_migration';
import { ensureGlobalAnonymizationProfile } from './global_profile_initializer';
import type { Logger } from '@kbn/core/server';
import type { ProfilesRepository } from '../repository';

jest.mock('./global_profile_initializer', () => ({
  ensureGlobalAnonymizationProfile: jest.fn().mockResolvedValue(undefined),
}));

describe('legacy_ui_settings_migration', () => {
  const logger = {
    warn: jest.fn(),
  } as unknown as Pick<Logger, 'warn'>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns empty rules when settings string is invalid JSON', () => {
    const result = extractEnabledLegacyRules('not valid json {');
    expect(result.regexRules).toHaveLength(0);
    expect(result.nerRules).toHaveLength(0);
  });

  it('extracts only enabled legacy regex and NER rules', () => {
    const settings = JSON.stringify({
      rules: [
        {
          type: 'RegExp',
          enabled: true,
          pattern: 'host-[0-9]+',
          entityClass: 'HOST_NAME',
        },
        {
          type: 'RegExp',
          enabled: false,
          pattern: 'ignored',
          entityClass: 'HOST_NAME',
        },
        {
          type: 'NER',
          enabled: true,
          allowedEntityClasses: ['PER', 'ORG'],
        },
      ],
    });

    const result = extractEnabledLegacyRules(settings);
    expect(result.regexRules).toHaveLength(1);
    expect(result.nerRules).toHaveLength(1);
  });

  it('migrates parsed rules into the global profile', async () => {
    const result = await migrateLegacyUiSettingsIntoGlobalProfile({
      namespace: 'default',
      settingsString: JSON.stringify({
        rules: [
          {
            type: 'RegExp',
            enabled: true,
            pattern: 'host-[0-9]+',
            entityClass: 'HOST_NAME',
          },
        ],
      }),
      profilesRepo: {} as ProfilesRepository,
      logger: logger as Logger,
    });

    expect(result).toBe(true);
    expect(ensureGlobalAnonymizationProfile).toHaveBeenCalled();
  });

  it('returns false when migration fails and logs warning', async () => {
    (ensureGlobalAnonymizationProfile as jest.Mock).mockRejectedValueOnce(new Error('boom'));

    const result = await migrateLegacyUiSettingsIntoGlobalProfile({
      namespace: 'default',
      settingsString: JSON.stringify({
        rules: [
          {
            type: 'RegExp',
            enabled: true,
            pattern: 'host-[0-9]+',
            entityClass: 'HOST_NAME',
          },
        ],
      }),
      profilesRepo: {} as ProfilesRepository,
      logger: logger as Logger,
    });

    expect(result).toBe(false);
    expect(logger.warn).toHaveBeenCalled();
  });
});
