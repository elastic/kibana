/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseExperimentalConfigValue } from '../../common/experimental_features';
import type { FleetAuthzRouter } from '../services/security';

import type { FleetConfigType } from '../config';

import { registerRoutes as registerAgentPolicyRoutes } from './agent_policy';
import { registerRoutes as registerPackagePolicyRoutes } from './package_policy';
import { registerRoutes as registerDataStreamRoutes } from './data_streams';
import { registerRoutes as registerEPMRoutes } from './epm';
import { registerRoutes as registerSetupRoutes } from './setup';
import { registerAPIRoutes as registerAgentAPIRoutes } from './agent';
import { registerRoutes as registerEnrollmentApiKeyRoutes } from './enrollment_api_key';
import { registerRoutes as registerOutputRoutes } from './output';
import { registerRoutes as registerSettingsRoutes } from './settings';
import { registerRoutes as registerAppRoutes } from './app';
import { registerRoutes as registerPreconfigurationRoutes } from './preconfiguration';
import { registerRoutes as registerDownloadSourcesRoutes } from './download_source';
import { registerRoutes as registerHealthCheckRoutes } from './health_check';
import { registerRoutes as registerFleetServerHostRoutes } from './fleet_server_hosts';
import { registerRoutes as registerFleetProxiesRoutes } from './fleet_proxies';
import { registerRoutes as registerMessageSigningServiceRoutes } from './message_signing_service';
import { registerRoutes as registerUninstallTokenRoutes } from './uninstall_token';
import { registerRoutes as registerStandaloneAgentApiKeyRoutes } from './standalone_agent_api_key';
import { registerRoutes as registerDebugRoutes } from './debug';
import { registerRoutes as registerRemoteSyncedIntegrations } from './remote_synced_integrations';
import { registerRoutes as registerCloudConnectorRoutes } from './cloud_connector';
import { registerRoutes as registerAgentlessPoliciesRoutes } from './agentless_policy'; //

export function registerRoutes(
  fleetAuthzRouter: FleetAuthzRouter,
  config: FleetConfigType,
  isServerless?: boolean
) {
  const experimentalFeatures = parseExperimentalConfigValue(
    config.enableExperimental || [],
    config.experimentalFeatures || {}
  );
  // Always register app routes for permissions checking
  registerAppRoutes(fleetAuthzRouter, experimentalFeatures, isServerless);

  // The upload package route is only authorized for the superuser
  registerEPMRoutes(fleetAuthzRouter, config);

  registerSetupRoutes(fleetAuthzRouter, config);
  registerAgentPolicyRoutes(fleetAuthzRouter, experimentalFeatures);
  registerPackagePolicyRoutes(fleetAuthzRouter);
  registerOutputRoutes(fleetAuthzRouter);
  registerSettingsRoutes(fleetAuthzRouter, experimentalFeatures);
  registerDataStreamRoutes(fleetAuthzRouter);
  registerPreconfigurationRoutes(fleetAuthzRouter);
  registerFleetServerHostRoutes(fleetAuthzRouter);
  registerFleetProxiesRoutes(fleetAuthzRouter);
  registerDownloadSourcesRoutes(fleetAuthzRouter);
  registerHealthCheckRoutes(fleetAuthzRouter);
  registerMessageSigningServiceRoutes(fleetAuthzRouter);
  registerUninstallTokenRoutes(fleetAuthzRouter, config);
  registerStandaloneAgentApiKeyRoutes(fleetAuthzRouter);
  registerRemoteSyncedIntegrations(fleetAuthzRouter, isServerless);
  registerDebugRoutes(fleetAuthzRouter);
  registerCloudConnectorRoutes(fleetAuthzRouter);

  registerAgentlessPoliciesRoutes(fleetAuthzRouter);

  // Conditional config routes
  if (config.agents.enabled) {
    registerAgentAPIRoutes(fleetAuthzRouter, config);
    registerEnrollmentApiKeyRoutes(fleetAuthzRouter);
  }
}
