/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const NIGHTSHIFT_FEATURE_ID = 'nightshift';

export const NIGHTSHIFT_MANAGE_ENGINES_SUB_FEATURE_ID = 'manage-engines';

/** HTTP `security.authz.requiredPrivileges` tags registered on the Nightshift feature. */
export const NIGHTSHIFT_API_PRIVILEGES = {
  read: 'read_nightshift',
  manage: 'manage_nightshift',
  configure: 'configure_nightshift',
} as const;

/** `capabilities.nightshift.*` keys granted by the feature's `ui:` list. */
export const NIGHTSHIFT_UI_PRIVILEGES = {
  show: 'show',
  manage: 'manage',
  configure: 'configure',
} as const;

export interface INightshiftCapabilities {
  canShow: boolean;
  canManage: boolean;
  canConfigure: boolean;
}

export function getNightshiftCapabilities(
  nightshift: Record<string, unknown> | undefined
): INightshiftCapabilities {
  return {
    canShow: nightshift?.[NIGHTSHIFT_UI_PRIVILEGES.show] === true,
    canManage: nightshift?.[NIGHTSHIFT_UI_PRIVILEGES.manage] === true,
    canConfigure: nightshift?.[NIGHTSHIFT_UI_PRIVILEGES.configure] === true,
  };
}
