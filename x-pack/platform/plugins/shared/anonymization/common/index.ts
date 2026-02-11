/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const PLUGIN_ID = 'anonymization';
export const PLUGIN_NAME = 'Anonymization';

/** Internal API version for all anonymization routes. */
export const ANONYMIZATION_API_VERSION = '1';

/** Base path for all anonymization profile APIs. */
export const ANONYMIZATION_PROFILES_API_BASE = '/internal/anonymization/profiles';

/**
 * System index name for anonymization profiles.
 * Uses `.kibana-` prefix so that `kibana_system` role has access.
 */
export const ANONYMIZATION_PROFILES_INDEX = '.kibana-anonymization-profiles';

/** Feature ID for Kibana feature privileges. */
export const ANONYMIZATION_FEATURE_ID = 'anonymization';

/** API privilege tags used in feature registration and route authz. */
export const apiPrivileges = {
  readAnonymization: 'read_anonymization',
  manageAnonymization: 'manage_anonymization',
} as const;

/** UI capability keys granted by feature privileges. */
export const uiPrivileges = {
  show: 'show',
  manage: 'manage',
} as const;
