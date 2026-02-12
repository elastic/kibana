/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type { NewPackagePolicy } from '../../../../common';
import type { CloudProvider, AccountType } from '../../../types';
import { AWSReusableConnectorForm } from '../aws_cloud_connector/aws_reusable_connector_form';
import { AzureReusableConnectorForm } from '../azure_cloud_connector/azure_reusable_connector_form';
import type { CloudConnectorCredentials } from '../types';
import { AWS_PROVIDER, AZURE_PROVIDER } from '../constants';

export const ReusableCloudConnectorForm: React.FC<{
  credentials: CloudConnectorCredentials;
  setCredentials: (credentials: CloudConnectorCredentials) => void;
  newPolicy: NewPackagePolicy;
  cloudProvider?: CloudProvider;
  isEditPage: boolean;
  accountType?: AccountType;
}> = ({ credentials, setCredentials, cloudProvider, newPolicy, isEditPage, accountType }) => {
  const provider = cloudProvider || AWS_PROVIDER;

  switch (provider) {
    case AWS_PROVIDER:
      return (
        <AWSReusableConnectorForm
          isEditPage={isEditPage}
          credentials={credentials}
          cloudConnectorId={newPolicy.cloud_connector_id || undefined}
          setCredentials={setCredentials}
          accountType={accountType}
        />
      );
    case AZURE_PROVIDER:
      return (
        <AzureReusableConnectorForm
          isEditPage={isEditPage}
          credentials={credentials}
          cloudConnectorId={newPolicy.cloud_connector_id || undefined}
          setCredentials={setCredentials}
          accountType={accountType}
        />
      );
    case 'gcp':
      // TODO: Implement GCP cloud connector forms
      return null;
    default:
      return null;
  }
};
