/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConsolePluginStart } from '@kbn/console-plugin/public';
import type { ConnectorDefinition, ConnectorServerSideDefinition } from '@kbn/search-connectors';
import type { SharePublicStart } from '@kbn/share-plugin/public/plugin';
import type { DiscoverStart } from '@kbn/discover-plugin/public';
import type { FleetStart } from '@kbn/fleet-plugin/public';
import type { CloudSetup, CloudStart } from '@kbn/cloud-plugin/public';
import type { GuidedOnboardingPluginStart } from '@kbn/guided-onboarding-plugin/public';
import type { ManagementSetup } from '@kbn/management-plugin/public';
import type { Pagination } from '@elastic/eui';
import type {
  IndexManagementPluginStart,
  IndexMappingProps,
} from '@kbn/index-management-shared-types';
import type { HomePublicPluginStart } from '@kbn/home-plugin/public';

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
  home: HomePublicPluginStart;
  share?: SharePublicStart;
  console?: ConsolePluginStart;
  discover?: DiscoverStart;
  fleet?: FleetStart;
  cloud?: CloudSetup & CloudStart;
  guidedOnboarding?: GuidedOnboardingPluginStart;
  indexManagement?: IndexManagementPluginStart;
}

export interface AppDependencies {
  connectorTypes: ConnectorDefinition[];
  kibanaVersion: string;
  isCloud: boolean;
  hasPlatinumLicense: boolean;
  plugins: SearchConnectorsPluginStartDependencies;
  isAgentlessEnabled: boolean;
  indexMappingComponent?: React.FC<IndexMappingProps>;
}

export const DEFAULT_DOCS_PER_PAGE = 25;
export const INDEX_DOCUMENTS_META_DEFAULT: Pagination = {
  pageIndex: 0,
  pageSize: DEFAULT_DOCS_PER_PAGE,
  totalItemCount: 0,
};
