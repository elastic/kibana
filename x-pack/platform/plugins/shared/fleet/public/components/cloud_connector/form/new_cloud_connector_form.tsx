/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type { NewCloudConnectorFormProps } from '../types';
import { AWSCloudConnectorForm } from '../aws_cloud_connector/aws_cloud_connector_form';
import { AzureCloudConnectorForm } from '../azure_cloud_connector/azure_cloud_connector_form';
import { AWS_PROVIDER, AZURE_PROVIDER } from '../constants';

export const NewCloudConnectorForm: React.FC<NewCloudConnectorFormProps> = ({
  newPolicy,
  packageInfo,
  updatePolicy,
  isEditPage = false,
  cloud,
  cloudProvider,
  credentials,
  setCredentials,
  hasInvalidRequiredVars,
  accountType,
  iacTemplateUrl,
}) => {
  // Default to AWS if no cloudProvider is specified
  const provider = cloudProvider || AWS_PROVIDER;

  switch (provider) {
    case AWS_PROVIDER:
      return (
        <AWSCloudConnectorForm
          newPolicy={newPolicy}
          packageInfo={packageInfo}
          updatePolicy={updatePolicy}
          isEditPage={isEditPage}
          cloud={cloud}
          hasInvalidRequiredVars={hasInvalidRequiredVars}
          cloudProvider={provider}
          credentials={credentials}
          setCredentials={setCredentials}
          accountType={accountType}
          iacTemplateUrl={iacTemplateUrl}
        />
      );
    case AZURE_PROVIDER:
      return (
        <AzureCloudConnectorForm
          newPolicy={newPolicy}
          packageInfo={packageInfo}
          updatePolicy={updatePolicy}
          isEditPage={isEditPage}
          cloud={cloud}
          hasInvalidRequiredVars={hasInvalidRequiredVars}
          credentials={credentials}
          setCredentials={setCredentials}
          accountType={accountType}
          iacTemplateUrl={iacTemplateUrl}
        />
      );
    case 'gcp':
      // TODO: Implement GCP cloud connector forms
      return null;
    default:
      return null;
  }
};
