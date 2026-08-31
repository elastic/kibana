/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FeatureFlagsStart } from '@kbn/core/server';
import { FF_MIGRATE_LEGACY_SECURITY_ASSETS } from '../../../common';

/**
 * Returns whether legacy Security-scoped Entity Store assets may be migrated to
 * solution-neutral names. Default is false so existing deployments keep reads and
 * writes on the old concrete indices until this flag is enabled for a given env.
 */
export const isLegacySecurityAssetsMigrationEnabled = (
  featureFlags: FeatureFlagsStart
): Promise<boolean> => featureFlags.getBooleanValue(FF_MIGRATE_LEGACY_SECURITY_ASSETS, false);
