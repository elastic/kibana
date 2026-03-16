/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CloudSetup } from '@kbn/cloud-plugin/public';

import type { NewPackagePolicy, PackageInfo } from '../../../common';
import type { CloudConnectorVar, CloudConnectorSecretVar } from '../../../common/types';
import type { AccountType, CloudConnectorSecretReference, CloudProvider } from '../../types';

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

export interface NewCloudConnectorFormProps {
  newPolicy: NewPackagePolicy;
  packageInfo: PackageInfo;
  updatePolicy: UpdatePolicy;
  isEditPage?: boolean;
  hasInvalidRequiredVars: boolean;
  cloud?: CloudSetup;
  cloudProvider?: CloudProvider;
  credentials?: CloudConnectorCredentials;
  setCredentials: (credentials: CloudConnectorCredentials) => void;
  /** Account type to determine organization vs single account behavior */
  accountType?: AccountType;
  /** IaC template URL from var_group selection for generating cloud connector setup instructions. */
  iacTemplateUrl?: string;
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
  newPolicy: NewPackagePolicy;
  packageInfo: PackageInfo;
  updatePolicy: UpdatePolicy;
  isEditPage?: boolean;
  hasInvalidRequiredVars: boolean;
  cloud?: CloudSetup;
  cloudProvider?: CloudProvider;
  credentials?: CloudConnectorCredentials;
  setCredentials: (credentials: CloudConnectorCredentials) => void;
  /** Account type for cloud connector template URL generation */
  accountType?: AccountType;
  /** IaC template URL from var_group selection for generating cloud connector setup instructions. */
  iacTemplateUrl?: string;
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

export interface GetCloudConnectorRemoteRoleTemplateParams {
  cloud: CloudSetupForCloudConnector;
  accountType: AccountType;
  /** IaC template URL to use for generating the cloud connector remote role template. */
  iacTemplateUrl?: string;
}

export interface CloudConnectorField {
  label: string;
  type?: 'text' | 'password' | undefined;
  isSecret?: boolean | undefined;
  dataTestSubj: string;
  value: string;
  id: string;
}
