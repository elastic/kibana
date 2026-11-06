/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRole } from '@kbn/scout';
import { tags } from '@kbn/scout';

/** Domains where CPS tier eligibility is true (Complete). */
export const CPS_ELIGIBLE_TIER_TAGS = [
  ...tags.serverless.security.complete,
  ...tags.serverless.observability.complete,
];

/** Domains where CPS tier eligibility is false (Essentials / logs_essentials). */
export const CPS_INELIGIBLE_TIER_TAGS = [
  ...tags.serverless.security.essentials,
  ...tags.serverless.observability.logs_essentials,
];

/**
 * Full Kibana access without ES project-routing cluster privileges.
 * Spaces management is available; the Cross-project search section is not.
 */
export const SPACES_MANAGE_NO_PROJECT_ROUTING_ROLE: KibanaRole = {
  elasticsearch: { cluster: [], indices: [] },
  kibana: [{ base: ['all'], feature: {}, spaces: ['*'] }],
};

/**
 * Full Kibana access with project-routing read only (no manage).
 * Edit page can show the section, but the picker is read-only; create stays hidden.
 *
 * Role definitions must use the predefined ES privilege names
 * (`read_project_routing` / `manage_project_routing`), not the action names
 * used in Kibana feature registration (`cluster:monitor/project_routing/get`).
 */
export const SPACES_MANAGE_PROJECT_ROUTING_READ_ROLE: KibanaRole = {
  elasticsearch: {
    cluster: ['read_project_routing'],
    indices: [],
  },
  kibana: [{ base: ['all'], feature: {}, spaces: ['*'] }],
};
