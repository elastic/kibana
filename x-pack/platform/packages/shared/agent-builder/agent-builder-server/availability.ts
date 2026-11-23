/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MaybePromise } from '@kbn/utility-types';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-server';

/**
 * Context provided to an availability handler.
 *
 * Shared base for tool, skill, and agent availability checks.
 */
export interface AvailabilityContext {
  request: KibanaRequest;
  uiSettings: IUiSettingsClient;
  spaceId: string;
}

/**
 * Result of an availability check.
 */
export interface AvailabilityResult {
  status: 'available' | 'unavailable';
  reason?: string;
}

/**
 * Handler that evaluates whether a resource is available.
 */
export type AvailabilityHandler = (
  context: AvailabilityContext
) => MaybePromise<AvailabilityResult>;

/**
 * Configuration for dynamic availability gating.
 *
 * Shared base for tool, skill, and agent availability. Attach to a
 * definition to conditionally hide a resource per-space, per-setting,
 * or per-user.
 *
 * This is *not* a replacement for RBAC: a result is a visibility hint that
 * can be served from cache after the caller's privileges changed, so the
 * resource must still enforce access itself.
 */
export interface AvailabilityConfig {
  handler: AvailabilityHandler;
  /**
   * Cache mode for the result. Pick the narrowest scope the handler's inputs vary by:
   * - `global`     — cached once for all spaces. For checks on the deployment:
   *                  license, feature flags, global settings.
   * - `space`      — cached per space. For checks on the space: solution view,
   *                  space settings, space-scoped data.
   * - `space-user` — cached per space and per principal. For checks on what the
   *                  caller is allowed to do, such as privileges. An API key is a
   *                  principal of its own, distinct from the user who owns it.
   *                  Not cached when the principal cannot be identified.
   * - `none`       — not cached: the handler runs on every evaluation, including
   *                  once per registered tool for each tool listing. Only for cheap
   *                  checks that must take effect immediately.
   */
  cacheMode: 'global' | 'space' | 'space-user' | 'none';
  /**
   * Optional TTL for the cached result, *in seconds*.
   * Defaults to 300 seconds (5 minutes).
   */
  cacheTtl?: number;
}
