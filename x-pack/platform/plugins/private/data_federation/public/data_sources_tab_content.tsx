/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React from 'react';

import type { ToastsStart } from '@kbn/core/public';
import type { DataSourceWithSecrets, DataSource } from '../common';
import type { FederatedIdentityClusterInfo } from './create_data_source_flyout/federated_identity_cluster_info';
import { CreateDataSourceFlyout } from './create_data_source_flyout';
import type { DataSourcesClient } from './data_sources_client';
import { DataSourcesTable } from './data_sources_table';

export type DataSourceFlyoutState =
  | { kind: 'closed' }
  | { kind: 'create' }
  | { kind: 'edit'; dataSource: DataSourceWithSecrets };

export type DataSourcesTabContentProps = Parameters<typeof DataSourcesTable>[0];

export const DataSourcesTabContent: FunctionComponent<DataSourcesTabContentProps> = (props) => {
  return <DataSourcesTable {...props} />;
};

export interface DataSourcesTabFlyoutProps {
  flyout: DataSourceFlyoutState;
  dataSourcesClient: DataSourcesClient;
  toasts: ToastsStart;
  cloudInfo?: FederatedIdentityClusterInfo;
  existingDataSourceNames: string[];
  featureFlags: {
    enableFederatedIdentityAuth?: boolean;
    enableGoogleCloudStorageDataSourceType?: boolean;
    enableAzureDataSourceType?: boolean;
  };
  onClose: () => void;
  onSave: (dataSource: DataSourceWithSecrets) => Promise<string | null>;
}

export const DataSourcesTabFlyout: FunctionComponent<DataSourcesTabFlyoutProps> = ({
  flyout,
  dataSourcesClient,
  toasts,
  cloudInfo,
  existingDataSourceNames,
  featureFlags,
  onClose,
  onSave,
}) => {
  if (flyout.kind === 'closed') {
    return null;
  }

  return (
    <CreateDataSourceFlyout
      key={flyout.kind === 'edit' ? flyout.dataSource.name : 'create'}
      initialDataSource={flyout.kind === 'edit' ? flyout.dataSource : undefined}
      dataSourcesClient={dataSourcesClient}
      toasts={toasts}
      cloudInfo={cloudInfo}
      existingDataSourceNames={existingDataSourceNames}
      featureFlags={featureFlags}
      onClose={onClose}
      onSave={onSave}
    />
  );
};

export type { DataSource };
