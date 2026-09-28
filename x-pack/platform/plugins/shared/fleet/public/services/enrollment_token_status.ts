/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EnrollmentAPIKey } from '../types';

export type EnrollmentTokenStatus = 'active' | 'expired' | 'inactive';

/**
 * Elasticsearch expires the API key behind an enrollment token on its own schedule, and nothing
 * writes `active: false` back to the token document, so an expired token is still stored as
 * active. An `expire_at` that cannot be parsed is treated as no expiration, so a bad value never
 * reports a usable token as expired.
 */
export const isEnrollmentTokenExpired = (apiKey: Pick<EnrollmentAPIKey, 'expire_at'>): boolean => {
  if (!apiKey.expire_at) {
    return false;
  }

  const expireAt = Date.parse(apiKey.expire_at);

  return !Number.isNaN(expireAt) && expireAt <= Date.now();
};

/**
 * `active` on the token document only tells you whether Fleet revoked the token, so expiration has
 * to be folded in separately to get the status a user should see.
 */
export const getEnrollmentTokenStatus = (
  apiKey: Pick<EnrollmentAPIKey, 'active' | 'expire_at'>
): EnrollmentTokenStatus => {
  if (!apiKey.active) {
    return 'inactive';
  }

  return isEnrollmentTokenExpired(apiKey) ? 'expired' : 'active';
};
