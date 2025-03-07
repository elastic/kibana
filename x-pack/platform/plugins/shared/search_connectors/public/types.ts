/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConsolePluginStart } from '@kbn/console-plugin/public';
import {
  ConnectorDefinition,
  ConnectorIndex,
  ConnectorServerSideDefinition,
  ElasticsearchIndex,
  ElasticsearchViewIndexExtension,
} from '@kbn/search-connectors';
import { SharePublicStart } from '@kbn/share-plugin/public/plugin';
import type { DiscoverStart } from '@kbn/discover-plugin/public';
import { HttpSetup, NavigateToUrlOptions, ScopedHistory } from '@kbn/core/public';
import { FleetStart } from '@kbn/fleet-plugin/public';
import { CloudSetup, CloudStart } from '@kbn/cloud-plugin/public';
import { GuidedOnboardingPluginStart } from '@kbn/guided-onboarding-plugin/public';

export interface SearchConnectorsPluginSetup {
  // we don't have docLinks here yet
  getConnectorTypes: () => ConnectorServerSideDefinition[];
}

export interface SearchConnectorsPluginStart {
  getConnectorTypes: () => ConnectorDefinition[];
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SearchConnectorsPluginSetupDependencies {}

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

export type ConnectorViewIndex = ConnectorIndex & ElasticsearchViewIndexExtension;

export type ApiViewIndex = ElasticsearchIndex & ElasticsearchViewIndexExtension;

export type ElasticsearchViewIndex = ConnectorViewIndex | ApiViewIndex;

export interface ReactRouterProps {
  to: string;
  onClick?(): void;
  // Used to navigate outside of the React Router plugin basename but still within Kibana,
  // e.g. if we need to go from Enterprise Search to App Search
  shouldNotCreateHref?: boolean;
  // Used if to is already a fully qualified URL that doesn't need basePath prepended
  shouldNotPrepend?: boolean;
  http?: HttpSetup;
  navigateToUrl?: (url: string, options?: NavigateToUrlOptions) => Promise<void>;
  history?: ScopedHistory;
}

export interface APIKeyResponse {
  apiKey: {
    api_key: string;
    encoded: string;
    id: string;
    name: string;
  };
}
