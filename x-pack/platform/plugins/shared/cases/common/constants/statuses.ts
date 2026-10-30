/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const CASE_STATUS_CATEGORIES = ['not_started', 'active', 'done'] as const;

/** EUI badge colors. They meet contrast requirements in light and dark themes. */
export const CASE_STATUS_COLORS = [
  'default',
  'hollow',
  'primary',
  'accent',
  'success',
  'warning',
  'danger',
] as const;

export const MAX_CASE_STATUSES = 50;
export const MAX_CASE_STATUS_KEY_LENGTH = 50;
export const MAX_CASE_STATUS_LABEL_LENGTH = 50;

export const CASES_SPACE_SETTINGS_SAVED_OBJECT = 'cases-space-settings' as const;
/** One settings document per space, so the id is fixed and the namespace scopes it. */
export const CASES_SPACE_SETTINGS_ID = 'cases-space-settings' as const;
export const INTERNAL_CASES_SPACE_SETTINGS_URL = '/internal/cases/space_settings' as const;
