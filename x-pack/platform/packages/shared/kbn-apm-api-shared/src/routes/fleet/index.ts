/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { hasApmPoliciesRoute } from './has_apm_policies';
import { fleetAgentsRoute } from './fleet_agents';
import { saveApmServerSchemaRoute } from './save_apm_server_schema';
import { unsupportedApmServerSchemaRoute } from './unsupported_apm_server_schema';
import { migrationCheckRoute } from './migration_check';
import { cloudApmPackagePolicyRoute } from './cloud_apm_package_policy';
import { javaAgentVersionsRoute } from './java_agent_versions';

export const fleetRouteDefinitions = {
  hasApmPolicies: hasApmPoliciesRoute,
  agents: fleetAgentsRoute,
  saveSchema: saveApmServerSchemaRoute,
  unsupportedSchema: unsupportedApmServerSchemaRoute,
  migrationCheck: migrationCheckRoute,
  cloudApmPackagePolicy: cloudApmPackagePolicyRoute,
  javaAgentVersions: javaAgentVersionsRoute,
};

export type { HasApmPoliciesResponse } from './has_apm_policies';
export type { FleetAgentResponse } from './fleet_agents';
export type {
  UnsupportedApmServerSchema,
  UnsupportedApmServerSchemaResponse,
} from './unsupported_apm_server_schema';
export type { RunMigrationCheckResponse } from './migration_check';
export type { CloudApmPackagePolicyResponse } from './cloud_apm_package_policy';
export type { JavaAgentVersionsResponse } from './java_agent_versions';
