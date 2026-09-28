/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FeatureFlagsStart } from '@kbn/core/server';
import { FF_MIGRATE_LEGACY_SECURITY_ASSETS } from '../../../common';
import { getLegacySecurityAssetsMigrationFlag } from './legacy_security_assets_migration';

describe('getLegacySecurityAssetsMigrationFlag', () => {
  it('resolves with the current value without waiting for it to become true', async () => {
    const getBooleanValue = jest.fn().mockResolvedValue(false);
    const featureFlags = { getBooleanValue } as unknown as FeatureFlagsStart;

    await expect(getLegacySecurityAssetsMigrationFlag(featureFlags)).resolves.toBe(false);
    expect(getBooleanValue).toHaveBeenCalledWith(FF_MIGRATE_LEGACY_SECURITY_ASSETS, false);
  });

  it('resolves true when the feature flag is enabled', async () => {
    const getBooleanValue = jest.fn().mockResolvedValue(true);
    const featureFlags = { getBooleanValue } as unknown as FeatureFlagsStart;

    await expect(getLegacySecurityAssetsMigrationFlag(featureFlags)).resolves.toBe(true);
  });
});
