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

/**
 * Grants `agentBuilder:read` — the minimum required to call nightshift read-only
 * routes (follow, start validation). Kept for backward-compat with nightshift tests.
 */
export const INVESTIGATIONS_READ_ROLE: KibanaRole = {
  elasticsearch: { cluster: [], indices: [] },
  kibana: [{ base: [], feature: { agentBuilder: ['read'] }, spaces: ['*'] }],
};

/**
 * Grants `agentBuilder:write` — needed to call nightshift write routes
 * (start, update, ensure). Kept for backward-compat with nightshift tests.
 */
export const INVESTIGATIONS_WRITE_ROLE: KibanaRole = {
  elasticsearch: { cluster: [], indices: [] },
  kibana: [{ base: [], feature: { agentBuilder: ['all'] }, spaces: ['*'] }],
};

/**
 * Grants `read_investigations` API privilege via the agenticInvestigations sub-feature.
 * Required to call GET /internal/investigations/investigations and
 * GET /internal/investigations/investigations/{id}.
 */
export const AGENTIC_INVESTIGATIONS_READ_ROLE: KibanaRole = {
  elasticsearch: { cluster: [], indices: [] },
  kibana: [{ base: [], feature: { agenticInvestigations: ['read'] }, spaces: ['*'] }],
};

/**
 * Grants both `read_investigations` and `manage_investigations` API privileges
 * via the agenticInvestigations sub-feature (`all` includes both).
 * Required to call POST /internal/investigations/investigations (upsert).
 */
export const AGENTIC_INVESTIGATIONS_MANAGE_ROLE: KibanaRole = {
  elasticsearch: { cluster: [], indices: [] },
  kibana: [{ base: [], feature: { agenticInvestigations: ['all'] }, spaces: ['*'] }],
};

/**
 * Combined role used for tests that exercise both nightshift write routes
 * (`agentBuilder:write`) and the agenticInvestigations upsert+read routes
 * (`manage_investigations`, `read_investigations`).
 */
export const COMBINED_INVESTIGATIONS_ADMIN_ROLE: KibanaRole = {
  elasticsearch: { cluster: [], indices: [] },
  kibana: [
    {
      base: [],
      feature: {
        agentBuilder: ['all'],
        agenticInvestigations: ['all'],
      },
      spaces: ['*'],
    },
  ],
};
