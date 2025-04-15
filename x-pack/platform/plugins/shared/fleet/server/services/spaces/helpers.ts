/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { appContextService } from '../app_context';
import {
  getIsSpaceAwarenessEnabledCache,
  setIsSpaceAwarenessEnabledCache,
} from '../epm/packages/cache';
import { getSettingsOrUndefined } from '../settings';

export const PENDING_MIGRATION_TIMEOUT = 60 * 60 * 1000;
/**
 * Return true if user optin for the space awareness feature.
 */
export async function isSpaceAwarenessEnabled(): Promise<boolean> {
  if (!appContextService.getExperimentalFeatures().useSpaceAwareness) {
    return false;
  }
  const cache = getIsSpaceAwarenessEnabledCache();
  if (typeof cache === 'boolean') {
    return cache;
  }

  const settings = await getSettingsOrUndefined(appContextService.getInternalUserSOClient());

  const res = settings?.use_space_awareness_migration_status === 'success' ?? false;
  setIsSpaceAwarenessEnabledCache(res);

  return res;
}

/**
 * Return true if space awareness migration is currently running
 */
export async function isSpaceAwarenessMigrationPending(): Promise<boolean> {
  if (!appContextService.getExperimentalFeatures().useSpaceAwareness) {
    return false;
  }

  const settings = await getSettingsOrUndefined(appContextService.getInternalUserSOClient());

  if (
    settings?.use_space_awareness_migration_status === 'pending' &&
    settings?.use_space_awareness_migration_started_at &&
    new Date(settings?.use_space_awareness_migration_started_at).getTime() >
      Date.now() - PENDING_MIGRATION_TIMEOUT
  ) {
    return true;
  }
  return false;
}
