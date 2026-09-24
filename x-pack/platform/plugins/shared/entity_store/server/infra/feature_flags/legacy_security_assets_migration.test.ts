/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Subject, of } from 'rxjs';
import type { FeatureFlagsStart } from '@kbn/core/server';
import { FF_MIGRATE_LEGACY_SECURITY_ASSETS } from '../../../common';
import { isLegacySecurityAssetsMigrationEnabled } from './legacy_security_assets_migration';

describe('isLegacySecurityAssetsMigrationEnabled', () => {
  it('resolves immediately when the feature flag is already true', async () => {
    const getBooleanValue$ = jest.fn().mockReturnValue(of(true));
    const featureFlags = { getBooleanValue$ } as unknown as FeatureFlagsStart;

    await expect(isLegacySecurityAssetsMigrationEnabled(featureFlags)).resolves.toBe(true);
    expect(getBooleanValue$).toHaveBeenCalledWith(FF_MIGRATE_LEGACY_SECURITY_ASSETS, false);
  });

  it('waits until the feature flag becomes true', async () => {
    const subject = new Subject<boolean>();
    const getBooleanValue$ = jest.fn().mockReturnValue(subject.asObservable());
    const featureFlags = { getBooleanValue$ } as unknown as FeatureFlagsStart;

    const promise = isLegacySecurityAssetsMigrationEnabled(featureFlags);

    subject.next(false);
    subject.next(false);
    subject.next(true);

    await expect(promise).resolves.toBe(true);
  });
});
