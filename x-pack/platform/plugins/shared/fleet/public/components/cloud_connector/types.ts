/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import type { CloudSetup } from '@kbn/cloud-plugin/public';

import type { NewPackagePolicy, NewPackagePolicyInput, PackageInfo } from '../../../common';
import type { CloudConnectorVar, CloudConnectorSecretVar } from '../../../common/types';
import type { CloudConnectorSecretReference, CloudProvider } from '../../types';

import type { AWS_PROVIDER, AZURE_PROVIDER, GCP_PROVIDER } from './constants';

export type CloudProviders = typeof AWS_PROVIDER | typeof GCP_PROVIDER | typeof AZURE_PROVIDER;

/**
 * Callback type for updating package policy
 */
export type UpdatePolicy = ({
  updatedPolicy,
  isValid,
  isExtensionLoaded,
}: {
  updatedPolicy: NewPackagePolicy;
  isValid?: boolean;
  isExtensionLoaded?: boolean;
}) => void;

interface BaseCloudConnectorCredentials {
  cloudConnectorId?: string;
  name?: string;
}
export interface AwsCloudConnectorCredentials extends BaseCloudConnectorCredentials {
  roleArn?: string;
  externalId?: string | CloudConnectorSecretReference;
}

export interface AzureCloudConnectorCredentials extends BaseCloudConnectorCredentials {
  tenantId?: string | CloudConnectorSecretReference;
  clientId?: string | CloudConnectorSecretReference;
  azure_credentials_cloud_connector_id?: string;
}

export type CloudConnectorCredentials =
  | AwsCloudConnectorCredentials
  | AzureCloudConnectorCredentials;

export interface CloudConnectorConfig {
  provider: CloudProviders;
  fields: CloudConnectorField[];
  description?: ReactNode;
}

export interface NewCloudConnectorFormProps {
  input: NewPackagePolicyInput;
  newPolicy: NewPackagePolicy;
  packageInfo: PackageInfo;
  updatePolicy: UpdatePolicy;
  isEditPage?: boolean;
  hasInvalidRequiredVars: boolean;
  cloud?: CloudSetup;
  cloudProvider?: CloudProvider;
  templateName?: string;
  credentials?: CloudConnectorCredentials;
  setCredentials: (credentials: CloudConnectorCredentials) => void;
}

// Define the interface for connector options
export interface AwsCloudConnectorOption {
  label: string;
  value: string;
  id: string;
  roleArn?: CloudConnectorVar;
  externalId?: CloudConnectorSecretVar;
}

export interface AzureCloudConnectorOption {
  label: string;
  value: string;
  id: string;
  tenantId?: CloudConnectorSecretVar;
  clientId?: CloudConnectorSecretVar;
  azure_credentials_cloud_connector_id?: CloudConnectorVar;
}

export interface CloudConnectorFormProps {
  input: NewPackagePolicyInput;
  newPolicy: NewPackagePolicy;
  packageInfo: PackageInfo;
  updatePolicy: UpdatePolicy;
  isEditPage?: boolean;
  hasInvalidRequiredVars: boolean;
  cloud?: CloudSetup;
  cloudProvider?: CloudProvider;
  isOrganization?: boolean;
  templateName?: string;
  credentials?: CloudConnectorCredentials;
  setCredentials: (credentials: CloudConnectorCredentials) => void;
}

export type CloudSetupForCloudConnector = Pick<
  CloudSetup,
  | 'isCloudEnabled'
  | 'cloudId'
  | 'cloudHost'
  | 'deploymentUrl'
  | 'serverless'
  | 'isServerlessEnabled'
>;

export interface CloudFormationCloudCredentialsGuideProps {
  cloudProvider?: CloudProvider;
}

export interface GetCloudConnectorRemoteRoleTemplateParams {
  input: NewPackagePolicyInput;
  cloud: CloudSetupForCloudConnector;
  packageInfo: PackageInfo;
  templateName: string;
  provider: CloudProviders;
}

export interface CloudConnectorField {
  label: string;
  type?: 'text' | 'password' | undefined;
  isSecret?: boolean | undefined;
  dataTestSubj: string;
  value: string;
  id: string;
}
