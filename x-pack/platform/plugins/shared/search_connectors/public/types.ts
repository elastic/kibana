/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConsolePluginStart } from '@kbn/console-plugin/public';
import { ConnectorDefinition, ConnectorServerSideDefinition } from '@kbn/search-connectors';
import { SharePublicStart } from '@kbn/share-plugin/public/plugin';
import type { DiscoverStart } from '@kbn/discover-plugin/public';
import { FleetStart } from '@kbn/fleet-plugin/public';
import { CloudSetup, CloudStart } from '@kbn/cloud-plugin/public';
import { GuidedOnboardingPluginStart } from '@kbn/guided-onboarding-plugin/public';
import { ManagementSetup } from '@kbn/management-plugin/public';

export interface SearchConnectorsPluginSetup {
  // we don't have docLinks here yet
  getConnectorTypes: () => ConnectorServerSideDefinition[];
}

export interface SearchConnectorsPluginStart {
  getConnectorTypes: () => ConnectorDefinition[];
}

export interface SearchConnectorsPluginSetupDependencies {
  management: ManagementSetup;
}

export interface SearchConnectorsPluginStartDependencies {
  share?: SharePublicStart;
  console?: ConsolePluginStart;
  discover?: DiscoverStart;
  fleet?: FleetStart;
  cloud?: CloudSetup & CloudStart;
  guidedOnboarding?: GuidedOnboardingPluginStart;
}

export interface AppDependencies {
  connectorTypes: ConnectorDefinition[];
  isCloud: boolean;
  hasPlatinumLicense: boolean;
  plugins: SearchConnectorsPluginStartDependencies;
  isAgentlessEnabled: boolean;
}
