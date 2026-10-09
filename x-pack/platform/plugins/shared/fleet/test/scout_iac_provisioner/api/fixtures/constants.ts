/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRole } from '@kbn/scout';

/** Internal, versioned (v1) render route — needs the api-version header. */
export const RENDER_TEMPLATE_PATH = 'internal/fleet/iac_provisioner/render_template';

export const COMMON_HEADERS = {
  'kbn-xsrf': 'scout',
  'x-elastic-internal-origin': 'kibana',
  'elastic-api-version': '1',
  'Content-Type': 'application/json;charset=UTF-8',
};

/**
 * Grants Fleet/Integrations read — enough to satisfy the route's
 * AGENT_POLICIES.READ | INTEGRATIONS.READ requirement.
 */
export const FLEET_READ_ROLE: KibanaRole = {
  elasticsearch: { cluster: [], indices: [] },
  kibana: [
    {
      base: [],
      feature: { fleetv2: ['read'], fleet: ['read'] },
      spaces: ['*'],
    },
  ],
};

/**
 * A valid, authenticated user with no Fleet privileges — the route must reject
 * it with 403 before any handler logic runs.
 */
export const NO_FLEET_ACCESS_ROLE: KibanaRole = {
  elasticsearch: { cluster: [], indices: [] },
  kibana: [
    {
      base: [],
      feature: { fleetv2: ['none'], fleet: ['none'] },
      spaces: ['*'],
    },
  ],
};
