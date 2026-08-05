/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ManagementSetup } from '@kbn/management-plugin/public';
import type { CloudSetup } from '@kbn/cloud-plugin/public';
import type { ToastsStart, ScopedHistory } from '@kbn/core/public';
import type { IndexManagementPluginStart } from '@kbn/index-management-shared-types';
import type { FederatedIdentityClusterInfo } from './create_data_source_flyout/federated_identity_cluster_info';
import type { DataSourcesClient } from './data_sources_client';
import type { DatasetsClient } from './datasets_client';

export interface SetupDependencies {
  management: ManagementSetup;
  cloud?: CloudSetup;
}

export interface StartDependencies {
  indexManagement: IndexManagementPluginStart;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface DataFederationPluginStart {}

export interface FederatedDataFeatureFlags {
  enableFederatedIdentityAuth?: boolean;
  enableGoogleCloudStorageDataSourceType?: boolean;
  enableAzureDataSourceType?: boolean;
}

export interface DataFederationKibanaServices {
  dataSourcesClient: DataSourcesClient;
  datasetsClient: DatasetsClient;
  toasts: ToastsStart;
  indexManagement: IndexManagementPluginStart;
  scopedHistory: ScopedHistory;
  cloudInfo?: FederatedIdentityClusterInfo;
  featureFlags?: FederatedDataFeatureFlags;
}
