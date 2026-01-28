/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  isAwsCloudConnectorVars,
  isAzureCloudConnectorVars,
} from '../../../common/services/cloud_connector_helpers';
import {
  extractRawCredentialVars,
  getCredentialStorageScope,
  resolveVarTarget,
  applyVarsAtTarget,
  getCredentialSchema,
  getAllVarKeys,
} from '../../../common/services/cloud_connectors';
import {
  AWS_ACCOUNT_TYPE_VAR_NAME,
  AZURE_ACCOUNT_TYPE_VAR_NAME,
  SINGLE_ACCOUNT,
  ORGANIZATION_ACCOUNT,
} from '../../../common/constants/cloud_connector';

import type {
  CloudProvider,
  CloudConnectorVars,
  AccountType,
  PackageInfo,
  AwsCloudConnectorVars,
  AzureCloudConnectorVars,
} from '../../../common/types';
import type { NewPackagePolicy } from '../../types';

/**
 * Extracts the account type from package policy variables
 *
 * @param cloudProvider - The cloud provider (aws, azure, gcp)
 * @param packagePolicy - The package policy containing account type vars
 * @param packageInfo - The package info for storage mode detection
 * @returns Account type ('single-account' or 'organization-account') or undefined if not found
 */
export function extractAccountType(
  cloudProvider: CloudProvider,
  packagePolicy: NewPackagePolicy,
  packageInfo: PackageInfo
): AccountType | undefined {
  // Use accessor to get vars from the correct location (package-level or input-level)
  const vars = extractRawCredentialVars(packagePolicy, packageInfo);

  if (!vars) {
    return undefined;
  }

  let rawAccountType: string | undefined;

  if (cloudProvider === 'aws') {
    rawAccountType = vars[AWS_ACCOUNT_TYPE_VAR_NAME]?.value;
  } else if (cloudProvider === 'azure') {
    rawAccountType = vars[AZURE_ACCOUNT_TYPE_VAR_NAME]?.value;
  }

  return validateAccountType(rawAccountType);
}

/**
 * Validates that the account type value is one of the standardized values
 *
 * All cloud providers use the same standardized values: 'single-account' or 'organization-account'
 *
 * @param accountType - The account type value from package policy
 * @returns Valid account type or undefined if not recognized
 */
export function validateAccountType(accountType: string | undefined): AccountType | undefined {
  if (!accountType) {
    return undefined;
  }

  // Validate against standardized values
  if (accountType === SINGLE_ACCOUNT || accountType === ORGANIZATION_ACCOUNT) {
    return accountType as AccountType;
  }

  return undefined;
}

/**
 * Updates package policy with cloud connector secret references at the correct location
 * This ensures that extractAndWriteSecrets recognizes these as existing secrets
 * and doesn't attempt to create duplicate secrets.
 *
 * @param packagePolicy - The package policy to update
 * @param cloudConnectorVars - Cloud connector variables with secret references
 * @param cloudProvider - The cloud provider (aws, azure, gcp)
 * @param packageInfo - The package info for storage mode detection
 * @returns Updated package policy with secret references in place
 */
export function updatePackagePolicyWithCloudConnectorSecrets(
  packagePolicy: NewPackagePolicy,
  cloudConnectorVars: CloudConnectorVars,
  cloudProvider: CloudProvider,
  packageInfo: PackageInfo
): NewPackagePolicy {
  const mode = getCredentialStorageScope(packageInfo);
  const { target, vars: currentVars } = resolveVarTarget(packagePolicy, mode);

  if (!currentVars) {
    return packagePolicy;
  }

  const updatedVars = { ...currentVars };

  // Get schema for the provider to find which keys to update
  const schema = getCredentialSchema(cloudProvider);

  if (cloudProvider === 'aws') {
    const awsVars = cloudConnectorVars as AwsCloudConnectorVars;
    // Update external_id with secret reference using schema-defined keys
    if (awsVars.external_id) {
      const externalIdKeys = getAllVarKeys(schema.fields.externalId);
      for (const key of externalIdKeys) {
        if (key in updatedVars) {
          updatedVars[key] = awsVars.external_id;
          break;
        }
      }
    }
  } else if (cloudProvider === 'azure') {
    const azureVars = cloudConnectorVars as AzureCloudConnectorVars;
    // Update tenant_id with secret reference using schema-defined keys
    if (azureVars.tenant_id) {
      const tenantIdKeys = getAllVarKeys(schema.fields.tenantId);
      for (const key of tenantIdKeys) {
        if (key in updatedVars) {
          updatedVars[key] = azureVars.tenant_id;
          break;
        }
      }
    }
    // Update client_id with secret reference using schema-defined keys
    if (azureVars.client_id) {
      const clientIdKeys = getAllVarKeys(schema.fields.clientId);
      for (const key of clientIdKeys) {
        if (key in updatedVars) {
          updatedVars[key] = azureVars.client_id;
          break;
        }
      }
    }
  }

  // Apply updated vars at the correct location based on storage scope
  return applyVarsAtTarget(packagePolicy, updatedVars, target);
}

/**
 * Extracts cloud connector name from package policy variables
 * Used to name cloud connectors based on user input or generate a default name
 *
 * @param packagePolicy - The package policy containing the cloud connector variables
 * @param targetCsp - The target cloud service provider
 * @param policyName - The agentless policy name to use for generating default name
 * @param packageInfo - The package info for storage mode detection
 * @returns The cloud connector name
 */
export function getCloudConnectorNameFromPackagePolicy(
  packagePolicy: NewPackagePolicy,
  targetCsp: CloudProvider,
  policyName: string,
  packageInfo: PackageInfo
): string {
  // Use accessor to get vars from the correct location (package-level or input-level)
  const vars = extractRawCredentialVars(packagePolicy, packageInfo);
  const defaultName = `${targetCsp}-cloud-connector: ${policyName}`;

  if (!vars) {
    return defaultName;
  }

  if (targetCsp === 'aws' && isAwsCloudConnectorVars(vars)) {
    return vars.role_arn.value;
  } else if (targetCsp === 'azure' && isAzureCloudConnectorVars(vars)) {
    return vars.azure_credentials_cloud_connector_id.value;
  }
  return defaultName;
}
