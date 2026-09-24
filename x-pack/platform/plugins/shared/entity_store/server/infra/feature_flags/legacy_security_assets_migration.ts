/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { firstValueFrom, filter } from 'rxjs';
import type { FeatureFlagsStart } from '@kbn/core/server';
import { FF_MIGRATE_LEGACY_SECURITY_ASSETS } from '../../../common';

/**
 * Resolves when the legacy Security-scoped Entity Store migration FF becomes true.
 * Uses the observable API to avoid the race condition where a single evaluation
 * can return the fallback before the provider has finished initializing.
 *
 * Only for the one-shot startup scheduling decision (`scheduleLegacySecurityAssetsMigrationIfNeeded`).
 * Request and task execution paths must use `getLegacySecurityAssetsMigrationFlag` instead —
 * waiting here blocks forever while the flag stays disabled, which is the default.
 */
export const isLegacySecurityAssetsMigrationEnabled = (
  featureFlags: FeatureFlagsStart
): Promise<boolean> =>
  firstValueFrom(
    featureFlags
      .getBooleanValue$(FF_MIGRATE_LEGACY_SECURITY_ASSETS, false)
      .pipe(filter((isEnabled) => isEnabled))
  );

/**
 * Reads the migration FF's current settled value without waiting for it to become true.
 * Safe for request and task execution paths (`AssetManagerClient`, the migration task's own
 * run), which must resolve immediately regardless of the flag's value.
 */
export const getLegacySecurityAssetsMigrationFlag = (
  featureFlags: FeatureFlagsStart
): Promise<boolean> => featureFlags.getBooleanValue(FF_MIGRATE_LEGACY_SECURITY_ASSETS, false);
