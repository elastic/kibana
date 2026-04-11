/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Reuses the role definitions from the Cypress YAML file
 * (cypress/lib/kibana_roles/project_controller_security_roles.yml)
 * which mirrors the serverless Security Solution roles.
 *
 * For stateful Scout tests, these are created on-the-fly via `getApiKeyForCustomRole()`.
 * The Cypress `Role` type includes extra fields (name, run_as) that must be stripped
 * to match the Scout `KibanaRole` interface.
 */

import type { KibanaRole } from '@kbn/scout/src/common/services/custom_role';
import { getServerlessSecurityKibanaRoleDefinitions } from '@kbn/osquery-plugin-cypress/lib/kibana_roles/kibana_roles';

const roles = getServerlessSecurityKibanaRoleDefinitions();

const toKibanaRole = (role: (typeof roles)[keyof typeof roles]): KibanaRole => ({
  elasticsearch: {
    cluster: role.elasticsearch.cluster,
    indices: role.elasticsearch.indices,
  },
  kibana: role.kibana,
});

export const T1_ANALYST_ROLE = toKibanaRole(roles.t1_analyst);
export const T2_ANALYST_ROLE = toKibanaRole(roles.t2_analyst);
