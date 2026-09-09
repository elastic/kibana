/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Kibana feature ID for the Anonymization section of GenAI Settings. */
export const ANONYMIZATION_SETTINGS_FEATURE_ID = 'inferenceAnonymizationSettings';

/**
 * API privilege strings used by feature registration and route authz.
 * A route grants access by listing one or more of these in `requiredPrivileges`.
 */
export const anonymizationApiPrivileges = {
  /** Read-only access: GET /settings, POST /_preview */
  read: 'read_inference_anonymization_settings',
  /** Write access: PUT /settings (includes read). */
  manage: 'manage_inference_anonymization_settings',
} as const;

/** UI capability names checked on the client side. */
export const anonymizationUiPrivileges = {
  show: 'show',
  manage: 'manage',
} as const;
