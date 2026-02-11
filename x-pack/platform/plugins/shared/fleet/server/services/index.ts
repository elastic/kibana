/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { agentPolicyService } from './agent_policy';
import * as settingsService from './settings';

export { getRegistryUrl } from './epm/registry/registry_url';

/**
 * Service that provides exported function that return information about EPM packages
 */

export interface AgentPolicyServiceInterface {
  create: (typeof agentPolicyService)['create'];
  createWithPackagePolicies: (typeof agentPolicyService)['createWithPackagePolicies'];
  get: (typeof agentPolicyService)['get'];
  list: (typeof agentPolicyService)['list'];
  delete: (typeof agentPolicyService)['delete'];
  getFullAgentPolicy: (typeof agentPolicyService)['getFullAgentPolicy'];
  getByIds: (typeof agentPolicyService)['getByIds'];
  turnOffAgentTamperProtections: (typeof agentPolicyService)['turnOffAgentTamperProtections'];
  fetchAllAgentPolicyIds: (typeof agentPolicyService)['fetchAllAgentPolicyIds'];
  fetchAllAgentPolicies: (typeof agentPolicyService)['fetchAllAgentPolicies'];
  deployPolicy: (typeof agentPolicyService)['deployPolicy'];
}

// Agent services
export { AgentServiceImpl } from './agents';
export type { AgentClient, AgentService } from './agents';
export { getAvailableVersions, getLatestAvailableAgentVersion } from './agents';

// Saved object services
export { agentPolicyService } from './agent_policy';
export { packagePolicyService } from './package_policy';
export { outputService } from './output';
export { downloadSourceService } from './download_source';
export { settingsService };
export { dataStreamService } from './data_streams';
export { fleetServerHostService } from './fleet_server_host';

// Plugin services
export { appContextService } from './app_context';
export { licenseService } from './license';
export { auditLoggingService } from './audit_logging';

// Artifacts services
export * from './artifacts';

// Policy preconfiguration functions
export { ensurePreconfiguredPackagesAndPolicies } from './preconfiguration';

// Package Services
export { PackageServiceImpl } from './epm';
export type { PackageService, PackageClient } from './epm';

// Fleet server policy config
export { migrateSettingsToFleetServerHost } from './fleet_server_host';

export { FleetUsageSender } from './telemetry/fleet_usage_sender';

export { checkAllowedPackages } from './check_allowed_packages';

export { cloudConnectorService } from './cloud_connector';
export type { CloudConnectorServiceInterface } from './cloud_connector';

export * from './cloud_connectors';

export type { MessageSigningServiceInterface } from './security';

export type { AgentlessPoliciesService } from './agentless/agentless_policies';
