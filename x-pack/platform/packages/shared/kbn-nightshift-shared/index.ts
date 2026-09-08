/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const NIGHTSHIFT_FEATURE_ID = 'nightshift';

/**
 * HTTP `security.authz.requiredPrivileges` tags. These are the `api:` entries on
 * each engine sub-feature, not the role-picker ids and not `capabilities.nightshift`.
 */
export const NIGHTSHIFT_CONTEXT_ENGINE_API_PRIVILEGES = {
  read: 'read_nightshift_context_engine',
  manage: 'manage_nightshift_context_engine',
} as const;

export const NIGHTSHIFT_DETECTION_ENGINE_API_PRIVILEGES = {
  read: 'read_nightshift_detection_engine',
  manage: 'manage_nightshift_detection_engine',
} as const;

export const NIGHTSHIFT_INVESTIGATION_ENGINE_API_PRIVILEGES = {
  read: 'read_nightshift_investigation_engine',
  manage: 'manage_nightshift_investigation_engine',
} as const;

/**
 * `capabilities.nightshift.*` keys granted by each engine's `ui:` list.
 */
export const NIGHTSHIFT_CONTEXT_ENGINE_UI_PRIVILEGES = {
  show: 'context_engine_show',
  manage: 'context_engine_manage',
} as const;

export const NIGHTSHIFT_DETECTION_ENGINE_UI_PRIVILEGES = {
  show: 'detection_engine_show',
  manage: 'detection_engine_manage',
} as const;

export const NIGHTSHIFT_INVESTIGATION_ENGINE_UI_PRIVILEGES = {
  show: 'investigation_engine_show',
  manage: 'investigation_engine_manage',
} as const;

/**
 * Role `feature.nightshift` sub-feature privilege ids (`context_engine_all`, …).
 * Use these in Scout roles and Spaces, not the API or UI strings above.
 */
export const NIGHTSHIFT_CONTEXT_ENGINE_SUB_FEATURE_PRIVILEGES = {
  all: 'context_engine_all',
  read: 'context_engine_read',
} as const;

export const NIGHTSHIFT_DETECTION_ENGINE_SUB_FEATURE_PRIVILEGES = {
  all: 'detection_engine_all',
  read: 'detection_engine_read',
} as const;

export const NIGHTSHIFT_INVESTIGATION_ENGINE_SUB_FEATURE_PRIVILEGES = {
  all: 'investigation_engine_all',
  read: 'investigation_engine_read',
} as const;

/** Context or Detection read. Availability and other shared read-only routes. */
export const NIGHTSHIFT_ANY_ENGINE_READ_PRIVILEGES = [
  NIGHTSHIFT_CONTEXT_ENGINE_API_PRIVILEGES.read,
  NIGHTSHIFT_DETECTION_ENGINE_API_PRIVILEGES.read,
] as const;

/** Context or Detection manage. Route-level door; handlers still branch on `authzResult`. */
export const NIGHTSHIFT_ANY_ENGINE_MANAGE_PRIVILEGES = [
  NIGHTSHIFT_CONTEXT_ENGINE_API_PRIVILEGES.manage,
  NIGHTSHIFT_DETECTION_ENGINE_API_PRIVILEGES.manage,
] as const;

/** Deployment-wide pause/resume/cleanup. */
export const NIGHTSHIFT_ACTIVITY_MANAGE_PRIVILEGES = [
  NIGHTSHIFT_CONTEXT_ENGINE_API_PRIVILEGES.manage,
  NIGHTSHIFT_DETECTION_ENGINE_API_PRIVILEGES.manage,
] as const;

/** Public queries and occurrence series. */
export const NIGHTSHIFT_QUERY_READ_PRIVILEGES = [
  NIGHTSHIFT_CONTEXT_ENGINE_API_PRIVILEGES.read,
  NIGHTSHIFT_DETECTION_ENGINE_API_PRIVILEGES.read,
] as const;

export interface INightshiftCapabilities {
  canShowContext: boolean;
  canShowDetection: boolean;
  canManageContext: boolean;
  canManageDetection: boolean;
}

export function getNightshiftCapabilities(
  nightshift: Record<string, unknown> | undefined
): INightshiftCapabilities {
  return {
    canShowContext: nightshift?.[NIGHTSHIFT_CONTEXT_ENGINE_UI_PRIVILEGES.show] === true,
    canShowDetection: nightshift?.[NIGHTSHIFT_DETECTION_ENGINE_UI_PRIVILEGES.show] === true,
    canManageContext: nightshift?.[NIGHTSHIFT_CONTEXT_ENGINE_UI_PRIVILEGES.manage] === true,
    canManageDetection: nightshift?.[NIGHTSHIFT_DETECTION_ENGINE_UI_PRIVILEGES.manage] === true,
  };
}

/** Detection show. Context Engine alone does not open `/app/nightshift`. */
export function canShowNightshiftLanding(capabilities: INightshiftCapabilities): boolean {
  return capabilities.canShowDetection;
}

/** Context or Detection show. */
export function canShowNightshiftManagement(capabilities: INightshiftCapabilities): boolean {
  return capabilities.canShowContext || capabilities.canShowDetection;
}

export function canPauseNightshiftActivity(capabilities: INightshiftCapabilities): boolean {
  return capabilities.canManageContext || capabilities.canManageDetection;
}
