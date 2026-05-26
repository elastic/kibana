/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type FailedDataLifecycleApplyPayload =
  | { inheritLifecycle: true }
  | { inheritLifecycle: false; failureStoreEnabled: boolean; retention?: string };

export interface BuildFailedDataLifecycleApplyPayloadArgs {
  inheritLifecycle: boolean;
  failureStoreEnabled: boolean;
  /**
   * Optional retention string (e.g. `60d`) used by Index Management. Streams omit it.
   * When `failureStoreEnabled` is false, retention is ignored.
   */
  retention?: string;
}

/**
 * Builds the minimal "apply" payload consumers typically need.
 *
 * - When inheriting, the upstream source is the source of truth, so no additional
 *   details are returned.
 * - When not inheriting, the failure store toggle is always included.
 * - Retention is optional and only included when failure store is enabled.
 */
export const buildFailedDataLifecycleApplyPayload = ({
  inheritLifecycle,
  failureStoreEnabled,
  retention,
}: BuildFailedDataLifecycleApplyPayloadArgs): FailedDataLifecycleApplyPayload => {
  if (inheritLifecycle) return { inheritLifecycle: true };

  const trimmedRetention = retention?.trim();
  return {
    inheritLifecycle: false,
    failureStoreEnabled,
    ...(failureStoreEnabled && trimmedRetention ? { retention: trimmedRetention } : {}),
  };
};
