/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, AppMountParameters } from '@kbn/core/public';
import type { ManagementSetup } from '@kbn/management-plugin/public';
import type { CloudSetup } from '@kbn/cloud-plugin/public';
import type { HomePublicPluginSetup } from '@kbn/home-plugin/public';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/public';
import type { CloudConnectTelemetryService } from './telemetry/client';
import type { CloudConnectApiService } from './lib/api';
import type { UseCloudConnectStatusHook } from './hooks';

export interface CloudConnectedPluginSetup {
  cloudUrl?: string;
}

export interface CloudConnectedPluginStart {
  hooks: {
    useCloudConnectStatus: UseCloudConnectStatusHook;
  };
}

export interface CloudConnectConfig {
  cloudUrl: string;
}

export interface CloudConnectApiConfig {
  hasEncryptedSOEnabled: boolean;
  license?: {
    type: string;
    uid: string;
  };
  cluster?: {
    id: string;
    name: string;
    version: string;
  };
}

export interface CloudConnectedSetupDeps {
  management: ManagementSetup;
  cloud?: CloudSetup;
  home?: HomePublicPluginSetup;
}

export interface CloudConnectedStartDeps {
  licensing: LicensingPluginStart;
}

export interface CloudConnectedAppComponentProps {
  chrome: CoreStart['chrome'];
  application: CoreStart['application'];
  http: CoreStart['http'];
  docLinks: CoreStart['docLinks'];
  notifications: CoreStart['notifications'];
  history: AppMountParameters['history'];
  cloudUrl: string;
  telemetryService: CloudConnectTelemetryService;
  apiService: CloudConnectApiService;
  licensing: LicensingPluginStart;
}

export interface ServiceMetadata {
  documentation_url?: string;
  service_url?: string;
  connect_url?: string;
}

export interface CloudService {
  enabled: boolean;
  support?: {
    supported: boolean;
    minimum_stack_version?: string;
    valid_license_types?: string[];
  };
  config?: {
    region_id?: string;
  };
  metadata?: ServiceMetadata;
  subscription?: {
    required: boolean;
  };
}

export interface ClusterDetails {
  id: string;
  name: string;
  metadata: {
    created_at: string;
    created_by: string;
    organization_id: string;
    subscription?: string;
  };
  self_managed_cluster: {
    id: string;
    name: string;
    version: string;
  };
  license: {
    type: string;
    uid: string;
  };
  services: {
    auto_ops?: CloudService;
    eis?: CloudService;
  };
}

// Utility type to extract service keys from ClusterDetails
export type ServiceType = keyof ClusterDetails['services'];
