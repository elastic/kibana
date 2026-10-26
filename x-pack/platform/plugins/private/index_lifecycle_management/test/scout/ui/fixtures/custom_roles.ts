/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRole } from '@kbn/scout';

// KibanaRole requires both `base` and `feature` in kibana entries, and `cluster`
// in elasticsearch (use empty arrays/objects when those privileges are not needed).
export const CUSTOM_ROLES: Record<string, KibanaRole> = {
  // cluster: manage_ilm + Kibana advancedSettings:read. Used by ILM home and duplicate-policy tests.
  manage_ilm: {
    elasticsearch: { cluster: ['manage_ilm'] },
    kibana: [{ base: [], feature: { advancedSettings: ['read'] }, spaces: ['*'] }],
  },

  // cluster: read_ilm + Kibana advancedSettings:read. Used by the ILM read-only view test.
  read_ilm: {
    elasticsearch: { cluster: ['read_ilm'] },
    kibana: [{ base: [], feature: { advancedSettings: ['read'] }, spaces: ['*'] }],
  },
};
