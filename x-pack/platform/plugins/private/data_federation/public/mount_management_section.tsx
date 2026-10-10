/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import type { CoreStart } from '@kbn/core/public';
import type { ManagementAppMountParams } from '@kbn/management-plugin/public';
import { Router } from '@kbn/shared-ux-router';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';

import { Main } from './main';
import type { FederatedIdentityClusterInfo } from './create_data_source_flyout/federated_identity_cluster_info';
import type { DataFederationKibanaServices, FederatedDataFeatureFlags } from './types';
import { DataSourcesClient } from './data_sources_client';
import { DatasetsClient } from './datasets_client';
import { getDiscoverLocator } from './get_discover_locator';
import { createServiceRegistry } from './service_registry/create_service_registry';

export const mountManagementSection = (
  coreStart: CoreStart,
  { element, history }: ManagementAppMountParams,
  {
    cloudInfo,
    share,
    featureFlags: {
      enableGoogleCloudStorageDataSourceType = false,
      enableAzureDataSourceType = false,
    } = {},
  }: {
    cloudInfo?: FederatedIdentityClusterInfo;
    share?: SharePluginStart;
    featureFlags?: FederatedDataFeatureFlags;
  }
) => {
  const serviceRegistry = createServiceRegistry({
    enableGoogleCloudStorageDataSourceType,
    enableAzureDataSourceType,
  });

  const enableFederatedIdentityAuth = isCloudEnabled && enableFederatedIdentityAuthConfig;
  const services: DataFederationKibanaServices = {
    dataSourcesClient: new DataSourcesClient(coreStart.http),
    datasetsClient: new DatasetsClient(coreStart.http),
    toasts: coreStart.notifications.toasts,
    docLinks: coreStart.docLinks,
    discoverLocator: getDiscoverLocator(coreStart.application.capabilities, share),
    cloudInfo,
    featureFlags: {
      enableGoogleCloudStorageDataSourceType,
      enableAzureDataSourceType,
    },
    serviceRegistry,
  };

  ReactDOM.render(
    coreStart.rendering.addContext(
      <KibanaContextProvider services={services}>
        <Router history={history}>
          <Main />
        </Router>
      </KibanaContextProvider>
    ),
    element
  );

  return () => {
    ReactDOM.unmountComponentAtNode(element);
  };
};
