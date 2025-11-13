/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CloudProvider, CloudConnectorVars, NewPackagePolicy } from '../../types';

/**
 * Updates package policy inputs with cloud connector secret references
 * This ensures that extractAndWriteSecrets recognizes these as existing secrets
 * and doesn't attempt to create duplicate secrets.
 *
 * @param packagePolicy - The package policy to update
 * @param cloudConnectorVars - Cloud connector variables with secret references
 * @param cloudProvider - The cloud provider (aws, azure, gcp)
 * @returns Updated package policy with secret references in place
 */
export function updatePackagePolicyWithCloudConnectorSecrets(
  packagePolicy: NewPackagePolicy,
  cloudConnectorVars: CloudConnectorVars,
  cloudProvider: CloudProvider
): NewPackagePolicy {
  const updatedInputs = packagePolicy.inputs.map((input) => {
    if (!input.enabled || !input.streams?.length) {
      return input;
    }

    const updatedStreams = input.streams.map((stream) => {
      if (!stream.vars) {
        return stream;
      }

      const updatedVars = { ...stream.vars };

      if (cloudProvider === 'aws') {
        const awsVars = cloudConnectorVars as any;
        // Update external_id with secret reference
        if (awsVars.external_id && updatedVars.external_id) {
          updatedVars.external_id = awsVars.external_id;
        } else if (awsVars.external_id && updatedVars['aws.credentials.external_id']) {
          updatedVars['aws.credentials.external_id'] = awsVars.external_id;
        }
      } else if (cloudProvider === 'azure') {
        const azureVars = cloudConnectorVars as any;
        // Update tenant_id and client_id with secret references
        if (azureVars.tenant_id && updatedVars.tenant_id) {
          updatedVars.tenant_id = azureVars.tenant_id;
        } else if (azureVars.tenant_id && updatedVars['azure.tenant_id']) {
          updatedVars['azure.tenant_id'] = azureVars.tenant_id;
        }

        if (azureVars.client_id && updatedVars.client_id) {
          updatedVars.client_id = azureVars.client_id;
        } else if (azureVars.client_id && updatedVars['azure.client_id']) {
          updatedVars['azure.client_id'] = azureVars.client_id;
        }
      }

      return {
        ...stream,
        vars: updatedVars,
      };
    });

    return {
      ...input,
      streams: updatedStreams,
    };
  });

  return {
    ...packagePolicy,
    inputs: updatedInputs,
  };
}

/**
 * Extracts cloud connector name from package policy vars
 * Used to name cloud connectors based on user input or generate a default name
 *
 * @param packagePolicy - The package policy containing vars
 * @param defaultName - Default name to use if cloud_connector_name is not found
 * @returns The cloud connector name
 */
export function getCloudConnectorNameFromPackagePolicy(
  packagePolicy: NewPackagePolicy,
  defaultName: string
): string {
  const vars = packagePolicy.inputs?.find((input) => input.enabled)?.streams[0]?.vars;
  return vars?.cloud_connector_name?.value || defaultName;
}
