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
 */
export const isLegacySecurityAssetsMigrationEnabled = (
  featureFlags: FeatureFlagsStart
): Promise<boolean> =>
  firstValueFrom(
    featureFlags
      .getBooleanValue$(FF_MIGRATE_LEGACY_SECURITY_ASSETS, false)
      .pipe(filter((isEnabled) => isEnabled))
  );
