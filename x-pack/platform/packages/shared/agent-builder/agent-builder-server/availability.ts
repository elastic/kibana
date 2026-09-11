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
 * or per-request. This is *not* a replacement for RBAC.
 */
export interface AvailabilityConfig {
  handler: AvailabilityHandler;
  /**
   * Cache mode for the result:
   * - `global` — cached once for all spaces
   * - `space`  — cached per space
   * - `none`   — not cached (warning: can cause performance issues)
   */
  cacheMode: 'global' | 'space' | 'none';
  /**
   * Optional TTL for the cached result, *in seconds*.
   * Defaults to 300 seconds (5 minutes).
   */
  cacheTtl?: number;
}
