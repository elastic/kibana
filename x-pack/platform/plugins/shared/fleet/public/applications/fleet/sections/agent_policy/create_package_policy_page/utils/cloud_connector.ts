/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  NewPackagePolicy,
  NewPackagePolicyInput,
  NewPackagePolicyInputStream,
  PackagePolicyConfigRecordEntry,
  CreateCloudConnectorRequest,
} from '../../../../types';

/**
 * Determines the cloud provider from package policy input/stream configuration
 */
function getCloudProviderFromPackagePolicy(
  packagePolicy: NewPackagePolicy
): 'aws' | 'azure' | 'gcp' | null {
  // Check if package policy has cloud connector support indicators
  if (!packagePolicy.supports_cloud_connector) {
    return null;
  }

  // Find the first enabled input
  const enabledInput = packagePolicy.inputs.find((input: NewPackagePolicyInput) => input.enabled);
  if (!enabledInput) {
    return null;
  }

  // Check input vars for cloud provider indicators
  const inputVars = enabledInput.vars || {};
  const inputType = enabledInput.type || '';

  // Get vars from both input and first enabled stream
  const enabledStream = enabledInput.streams?.find(
    (stream: NewPackagePolicyInputStream) => stream.enabled
  );
  const allVars = { ...inputVars, ...enabledStream?.vars };

  // Determine provider from var names or input type
  // Check for AWS-related vars (both regular and namespaced)
  if (
    allVars.role_arn ||
    allVars.external_id ||
    allVars['aws.credentials.external_id'] ||
    inputType.includes('aws')
  ) {
    return 'aws';
  }

  // Check for Azure-related vars (both regular and namespaced)
  if (
    allVars.tenant_id ||
    allVars.client_id ||
    allVars.azure_credentials_cloud_connector_id ||
    allVars['azure.credentials.tenant_id'] ||
    allVars['azure.credentials.client_id'] ||
    inputType.includes('azure')
  ) {
    return 'azure';
  }

  if (inputType.includes('gcp') || inputType.includes('google')) {
    return 'gcp';
  }

  return null;
}

/**
 * Extracts a var value from package policy input or stream vars
 */
function extractVarValue(varEntry: PackagePolicyConfigRecordEntry | undefined): string | undefined {
  if (!varEntry) {
    return undefined;
  }

  // Handle both direct value and value.value structure
  if (typeof varEntry.value === 'string') {
    return varEntry.value;
  }

  // For complex values, try to get the underlying string value
  if (varEntry.value && typeof varEntry.value === 'object' && 'value' in varEntry.value) {
    return varEntry.value.value as string;
  }

  return undefined;
}

/**
 * Extracts cloud connector configuration from package policy inputs
 * Returns formatted CreateCloudConnectorRequest or null if no cloud connector data found
 */
export function extractCloudConnectorVars(
  packagePolicy: NewPackagePolicy
): CreateCloudConnectorRequest | null {
  const cloudProvider = getCloudProviderFromPackagePolicy(packagePolicy);

  if (!cloudProvider) {
    return null;
  }

  // Find the first enabled input
  const enabledInput = packagePolicy.inputs.find((input: NewPackagePolicyInput) => input.enabled);
  if (!enabledInput) {
    return null;
  }

  // Get vars from input or first enabled stream
  const enabledStream = enabledInput.streams?.find(
    (stream: NewPackagePolicyInputStream) => stream.enabled
  );
  const vars = { ...enabledInput.vars, ...enabledStream?.vars };

  // Generate connector name from package policy name or input name
  const connectorName = `${packagePolicy.name || 'Unnamed'} Cloud Connector`;

  switch (cloudProvider) {
    case 'aws': {
      const roleArn = extractVarValue(vars.role_arn);
      // Check both regular and namespaced external_id
      const externalId =
        extractVarValue(vars.external_id) || extractVarValue(vars['aws.credentials.external_id']);

      if (!roleArn || !externalId) {
        return null;
      }

      return {
        name: connectorName,
        cloudProvider: 'aws',
        vars: {
          role_arn: {
            type: 'text',
            value: roleArn,
          },
          external_id: {
            type: 'password',
            value: {
              isSecretRef: true,
              id: externalId,
            },
          },
        },
      };
    }

    case 'azure': {
      // Check both regular and namespaced variable names
      const tenantId =
        extractVarValue(vars.tenant_id) || extractVarValue(vars['azure.credentials.tenant_id']);
      const clientId =
        extractVarValue(vars.client_id) || extractVarValue(vars['azure.credentials.client_id']);
      const azureCredentialsCloudConnectorId = extractVarValue(
        vars.azure_credentials_cloud_connector_id
      );

      if (!tenantId || !clientId || !azureCredentialsCloudConnectorId) {
        return null;
      }

      return {
        name: connectorName,
        cloudProvider: 'azure',
        vars: {
          tenant_id: {
            type: 'password',
            value: {
              isSecretRef: true,
              id: tenantId,
            },
          },
          client_id: {
            type: 'password',
            value: {
              isSecretRef: true,
              id: clientId,
            },
          },
          azure_credentials_cloud_connector_id: {
            type: 'text',
            value: azureCredentialsCloudConnectorId,
          },
        },
      };
    }

    case 'gcp':
      // GCP cloud connector support not yet implemented
      return null;

    default:
      return null;
  }
}

/**
 * Determines whether to use the new atomic cloud connector API vs legacy flow
 */
export function shouldUseCloudConnectorAPI(
  packagePolicy: NewPackagePolicy,
  selectedPolicyTab: string,
  hasExistingConnector: boolean = false
): boolean {
  return (
    packagePolicy.supports_cloud_connector === true &&
    packagePolicy.supports_agentless === true &&
    selectedPolicyTab === 'new' && // Creating NEW agent policy
    !hasExistingConnector && // No existing connector ID
    !packagePolicy.cloud_connector_id // Not referencing an existing connector
  );
}
