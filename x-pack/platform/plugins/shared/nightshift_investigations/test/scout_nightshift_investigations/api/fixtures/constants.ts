/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRole } from '@kbn/scout';
import { NIGHTSHIFT_INVESTIGATION_ENGINE_SUB_FEATURE_PRIVILEGES } from '@kbn/nightshift-shared';

export const COMMON_HEADERS = {
  'kbn-xsrf': 'true',
  'x-elastic-internal-origin': 'kibana',
} as const;

// The role API requires at least one of `base` or `feature` to be non-empty.
// Grant an unrelated privilege so this user can authenticate but still lacks
// Investigation Engine.
export const NO_INVESTIGATION_ENGINE_ROLE: KibanaRole = {
  elasticsearch: { cluster: [], indices: [] },
  kibana: [{ base: [], feature: { advancedSettings: ['read'] }, spaces: ['*'] }],
};

export const INVESTIGATIONS_READ_ROLE: KibanaRole = {
  elasticsearch: { cluster: [], indices: [] },
  kibana: [
    {
      base: [],
      feature: {
        nightshift: ['minimal_all', NIGHTSHIFT_INVESTIGATION_ENGINE_SUB_FEATURE_PRIVILEGES.read],
      },
      spaces: ['*'],
    },
  ],
};

export const INVESTIGATIONS_MANAGE_ROLE: KibanaRole = {
  elasticsearch: { cluster: [], indices: [] },
  kibana: [
    {
      base: [],
      feature: {
        nightshift: ['minimal_all', NIGHTSHIFT_INVESTIGATION_ENGINE_SUB_FEATURE_PRIVILEGES.all],
      },
      spaces: ['*'],
    },
  ],
};
