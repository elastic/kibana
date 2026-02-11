/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useCallback, useMemo } from 'react';

import type { NewPackagePolicy, PackageInfo, PackagePolicyConfigRecord } from '../../../../common';
import {
  extractRawCredentialVars,
  getCredentialStorageScope,
  resolveVarTarget,
  applyVarsAtTarget,
} from '../../../../common';
import type { PackagePolicyConfigRecordEntry, AccountType, CloudProvider } from '../../../types';
import type { UpdatePolicy } from '../types';
import type { CloudConnectorCredentials, AwsCloudConnectorCredentials } from '../types';
import {
  isAzureCloudConnectorVars,
  updateInputVarsWithCredentials,
  isCloudConnectorNameValid,
} from '../utils';
import {
  AWS_CLOUD_CONNECTOR_FIELD_NAMES,
  AZURE_CLOUD_CONNECTOR_FIELD_NAMES,
  AWS_ACCOUNT_TYPE_INPUT_VAR_NAME,
  AZURE_ACCOUNT_TYPE_INPUT_VAR_NAME,
  SINGLE_ACCOUNT,
  ORGANIZATION_ACCOUNT,
} from '../constants';

export interface UseCloudConnectorSetupReturn {
  // State for new connection form
  newConnectionCredentials: CloudConnectorCredentials;
  setNewConnectionCredentials: (credentials: CloudConnectorCredentials) => void;

  // State for existing connection form
  existingConnectionCredentials: CloudConnectorCredentials;
  setExistingConnectionCredentials: (credentials: CloudConnectorCredentials) => void;

  // Update policy callbacks
  updatePolicyWithNewCredentials: (credentials: CloudConnectorCredentials) => void;
  updatePolicyWithExistingCredentials: (credentials: CloudConnectorCredentials) => void;

  // Account type from package policy inputs
  accountTypeFromInputs?: AccountType;
}

// Helper function to extract value from var entry (handles both string and secret reference)
const extractVarValue = (
  varEntry: PackagePolicyConfigRecordEntry | undefined
): string | undefined => {
  if (!varEntry?.value) {
    return undefined;
  }

  // Handle string values directly
  if (typeof varEntry.value === 'string') {
    return varEntry.value;
  }

  // Handle secret reference objects
  if (typeof varEntry.value === 'object' && 'id' in varEntry.value) {
    return varEntry.value.id;
  }

  return undefined;
};

// Helper function to extract account type from package policy inputs
export const getAccountTypeFromInputs = (
  cloudProvider: CloudProvider,
  packagePolicy: NewPackagePolicy
): AccountType | undefined => {
  const vars = packagePolicy.inputs.find((input) => input.enabled)?.streams[0]?.vars;

  if (!vars) {
    return undefined;
  }

  let accountTypeVarName: string;

  if (cloudProvider === 'aws') {
    accountTypeVarName = AWS_ACCOUNT_TYPE_INPUT_VAR_NAME;
  } else if (cloudProvider === 'azure') {
    accountTypeVarName = AZURE_ACCOUNT_TYPE_INPUT_VAR_NAME;
  } else {
    return undefined;
  }

  const accountTypeValue = extractVarValue(vars[accountTypeVarName]);

  // Return the account type if it's a valid AccountType value
  if (accountTypeValue === SINGLE_ACCOUNT || accountTypeValue === ORGANIZATION_ACCOUNT) {
    return accountTypeValue;
  }

  return undefined;
};

// Helper function to create initial credentials based on existing vars
const createInitialCredentials = (vars: PackagePolicyConfigRecord): CloudConnectorCredentials => {
  if (isAzureCloudConnectorVars(vars, 'azure')) {
    const azureCredentialsId =
      extractVarValue(vars.azure_credentials_cloud_connector_id) ||
      extractVarValue(vars[AZURE_CLOUD_CONNECTOR_FIELD_NAMES.AZURE_CREDENTIALS_CLOUD_CONNECTOR_ID]);

    return {
      tenantId:
        extractVarValue(vars.tenant_id) ||
        extractVarValue(vars[AZURE_CLOUD_CONNECTOR_FIELD_NAMES.AZURE_TENANT_ID]),
      clientId:
        extractVarValue(vars.client_id) ||
        extractVarValue(vars[AZURE_CLOUD_CONNECTOR_FIELD_NAMES.AZURE_CLIENT_ID]),
      azure_credentials_cloud_connector_id: azureCredentialsId,
    };
  }

  // Default to AWS credentials (role_arn is a text var, external_id could be secret or text)
  return {
    roleArn:
      extractVarValue(vars.role_arn) ||
      extractVarValue(vars[AWS_CLOUD_CONNECTOR_FIELD_NAMES.ROLE_ARN]),
    externalId:
      extractVarValue(vars.external_id) ||
      extractVarValue(vars[AWS_CLOUD_CONNECTOR_FIELD_NAMES.EXTERNAL_ID]),
  } as AwsCloudConnectorCredentials;
};

/**
 * Updates the vars at the correct location based on credential storage scope.
 *
 * Cloud connector credentials can be stored at two scopes:
 * - Package scope: policy.vars (global to the package)
 * - Input/stream scope: policy.inputs[].streams[].vars
 */
const updatePolicyVarsByScope = (
  policy: NewPackagePolicy,
  updatedVars: PackagePolicyConfigRecord,
  packageInfo: PackageInfo
): NewPackagePolicy => {
  const scope = getCredentialStorageScope(packageInfo);
  const { target } = resolveVarTarget(policy, scope);

  return applyVarsAtTarget(policy, updatedVars, target);
};

export const useCloudConnectorSetup = (
  newPolicy: NewPackagePolicy,
  updatePolicy: UpdatePolicy,
  packageInfo: PackageInfo,
  cloudProvider?: CloudProvider
): UseCloudConnectorSetupReturn => {
  // State for new connection form
  const [newConnectionCredentials, setNewConnectionCredentials] =
    useState<CloudConnectorCredentials>(() => {
      // Use accessor to get vars from the correct location
      const vars = extractRawCredentialVars(newPolicy, packageInfo) ?? {};
      return createInitialCredentials(vars);
    });

  // State for existing connection form
  const [existingConnectionCredentials, setExistingConnectionCredentials] =
    useState<CloudConnectorCredentials>({});

  // Extract account type from inputs
  const accountTypeFromInputs = useMemo(() => {
    if (!cloudProvider) {
      return undefined;
    }
    return getAccountTypeFromInputs(cloudProvider, newPolicy);
  }, [cloudProvider, newPolicy]);

  // Update policy with new connection credentials
  const updatePolicyWithNewCredentials = useCallback(
    (credentials: CloudConnectorCredentials) => {
      // Get current vars from the correct location
      const currentVars = extractRawCredentialVars(newPolicy, packageInfo);

      // Use shared validation utility for name validation
      const isNameValid = isCloudConnectorNameValid(credentials.name);

      // Update credentials in vars
      const updatedInputVars = updateInputVarsWithCredentials(
        currentVars as PackagePolicyConfigRecord,
        credentials
      );

      // Create updated policy with vars at the correct location
      let updatedPolicy = updatePolicyVarsByScope(
        { ...newPolicy },
        updatedInputVars as PackagePolicyConfigRecord,
        packageInfo
      );

      // Set cloud_connector_name directly on the policy object (not in input vars)
      updatedPolicy = {
        ...updatedPolicy,
        cloud_connector_name: credentials.name,
        cloud_connector_id: undefined,
      };

      updatePolicy({
        updatedPolicy,
        isValid: isNameValid ? undefined : false,
      });

      setNewConnectionCredentials(credentials);
    },
    [newPolicy, updatePolicy, packageInfo]
  );

  // Update policy with existing connection credentials
  const updatePolicyWithExistingCredentials = useCallback(
    (credentials: CloudConnectorCredentials) => {
      // Get current vars from the correct location
      const currentVars = extractRawCredentialVars(newPolicy, packageInfo);

      // Update credentials in vars
      const updatedInputVars = updateInputVarsWithCredentials(
        currentVars as PackagePolicyConfigRecord,
        credentials
      );

      // Create updated policy with vars at the correct location
      let updatedPolicy = newPolicy;
      if (updatedInputVars) {
        updatedPolicy = updatePolicyVarsByScope({ ...newPolicy }, updatedInputVars, packageInfo);
      }

      // Set cloud connector ID if provided
      if (credentials.cloudConnectorId) {
        updatedPolicy = {
          ...updatedPolicy,
          cloud_connector_id: credentials.cloudConnectorId,
        };
      }

      // Update existing connection credentials state
      setExistingConnectionCredentials(credentials);

      updatePolicy({ updatedPolicy });
    },
    [newPolicy, updatePolicy, packageInfo]
  );

  return {
    newConnectionCredentials,
    setNewConnectionCredentials,
    existingConnectionCredentials,
    setExistingConnectionCredentials,
    updatePolicyWithNewCredentials,
    updatePolicyWithExistingCredentials,
    accountTypeFromInputs,
  };
};
