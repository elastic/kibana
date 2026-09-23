/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRole } from '@kbn/scout';

export const COMMON_HEADERS = {
  'kbn-xsrf': 'true',
  'x-elastic-internal-origin': 'kibana',
} as const;

// The role API requires at least one of `base` or `feature` to be non-empty.
// Grant an unrelated privilege so this user can authenticate but still lacks
// agentBuilder:read (viewer includes it, which is why we cannot use that).
export const NO_AGENT_BUILDER_ROLE: KibanaRole = {
  elasticsearch: { cluster: [], indices: [] },
  kibana: [{ base: [], feature: { advancedSettings: ['read'] }, spaces: ['*'] }],
};

export const INVESTIGATIONS_READ_ROLE: KibanaRole = {
  elasticsearch: { cluster: [], indices: [] },
  kibana: [{ base: [], feature: { agentBuilder: ['read'] }, spaces: ['*'] }],
};

export const INVESTIGATIONS_WRITE_ROLE: KibanaRole = {
  elasticsearch: { cluster: [], indices: [] },
  kibana: [{ base: [], feature: { agentBuilder: ['all'] }, spaces: ['*'] }],
};
