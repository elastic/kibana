/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRole } from '@kbn/scout';

export const COMMON_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
  'x-elastic-internal-origin': 'kibana',
  'elastic-api-version': '1',
};

export const ONBOARDING_AWS_API_PATH = '/internal/ingest_hub/onboarding/aws';

/**
 * Role with Fleet integrations `all` + Fleet v2 `all` (agent policies).
 * This satisfies `authz.integrations.installPackages`.
 */
export const FLEET_INTEGRATIONS_ALL_ROLE: KibanaRole = {
  elasticsearch: { cluster: [] },
  kibana: [{ base: [], feature: { fleet: ['all'], fleetv2: ['all'] }, spaces: ['*'] }],
};

/**
 * Role with no Fleet privileges at all.
 */
export const NO_FLEET_ROLE: KibanaRole = {
  elasticsearch: { cluster: [] },
  kibana: [{ base: [], feature: { dashboard: ['read'] }, spaces: ['*'] }],
};
