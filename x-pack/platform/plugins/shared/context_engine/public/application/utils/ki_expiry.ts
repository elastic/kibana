/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KiLifecycleStatus } from '../../../common/step_types/ki';

export type KiStatus = KiLifecycleStatus | 'expired';

export const KI_STATUS_BADGE_COLOR: Record<KiStatus, 'success' | 'danger' | 'warning'> = {
  active: 'success',
  deleted: 'danger',
  verification_failed: 'warning',
  expired: 'warning',
};

export const KI_STATUS_LABEL: Record<KiStatus, string> = {
  active: 'active',
  deleted: 'deleted',
  verification_failed: 'failed',
  expired: 'expired',
};

export const isKiExpired = (expiresAt?: string): boolean => {
  const expiresAtMs = Date.parse(expiresAt ?? '');
  if (Number.isNaN(expiresAtMs)) {
    return false;
  }
  return expiresAtMs <= Date.now();
};

export const resolveKiStatus = (
  lifecycleStatus?: KiLifecycleStatus,
  expiresAt?: string
): KiStatus => {
  if (lifecycleStatus === 'deleted' || lifecycleStatus === 'verification_failed') {
    return lifecycleStatus;
  }
  if (isKiExpired(expiresAt)) {
    return 'expired';
  }
  return 'active';
};
