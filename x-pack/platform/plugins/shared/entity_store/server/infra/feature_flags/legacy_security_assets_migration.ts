/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FeatureFlagsStart } from '@kbn/core/server';
import { FF_MIGRATE_LEGACY_SECURITY_ASSETS } from '../../../common';

/**
 * Reads the migration FF's current settled value without waiting for it to become true.
 * Safe for request and task execution paths (`AssetManagerClient`, the migration task's own
 * run), which must resolve immediately regardless of the flag's value.
 */
export const getLegacySecurityAssetsMigrationFlag = (
  featureFlags: FeatureFlagsStart
): Promise<boolean> => featureFlags.getBooleanValue(FF_MIGRATE_LEGACY_SECURITY_ASSETS, false);
