/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup, ToastsStart } from '@kbn/core/public';
import type { FederatedIdentityClusterInfo } from './create_data_source_flyout/federated_identity_cluster_info';

export interface DataFederationKibanaServices {
  http: HttpSetup;
  toasts: ToastsStart;
  cloudInfo?: FederatedIdentityClusterInfo;
  featureFlags?: {
    enableFederatedIdentityAuth?: boolean;
    enableGoogleCloudStorageDataSourceType?: boolean;
    enableAzureDataSourceType?: boolean;
  };
}
