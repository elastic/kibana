/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Cloud Connector Variable Extraction Service
 *
 * This service provides utilities to extract cloud connector configuration from package policies
 * and determine when to use the atomic cloud connector API.
 *
 * Background:
 * The atomic cloud connector API (POST /internal/fleet/cloud_connector_with_package_policy)
 * creates an agent policy, cloud connector, and package policy in a single transaction with
 * automatic rollback on failure. This prevents orphaned resources and ensures consistency.
 *
 * Usage in form.tsx:
 * 1. shouldUseCloudConnectorAPI() checks if the atomic API should be used
 * 2. extractCloudConnectorVars() extracts credentials from package policy inputs
 * 3. onSubmit() uses these helpers to either:
 *    - Call the atomic API (for new policies with cloud connectors)
 *    - Use the traditional flow (for existing policies or non-cloud-connector integrations)
 *
 * Supported Providers:
 * - AWS: Extracts role_arn and external_id from input vars
 * - Azure: Extracts tenant_id, client_id, and client_secret (TODO: update types when Azure support is added)
 */

import type {
  CloudConnectorVars,
  CloudProvider,
} from '../../../../../../../../common/types/models/cloud_connector';
import type {
  NewPackagePolicy,
  NewPackagePolicyInput,
} from '../../../../../../../../common/types/models/package_policy';

interface CloudConnectorData {
  cloudProvider: CloudProvider;
  vars: CloudConnectorVars;
}

/**
 * Extracts cloud connector configuration from package policy inputs.
 * Looks for AWS or Azure credentials in the enabled input streams.
 *
 * @param packagePolicy - The package policy containing cloud connector inputs
 * @returns Cloud connector data if found, undefined otherwise
 */
export function extractCloudConnectorVars(
  packagePolicy: NewPackagePolicy
): CloudConnectorData | undefined {
  if (!packagePolicy.supports_cloud_connector) {
    return undefined;
  }

  const enabledInput = packagePolicy.inputs?.find(
    (input: NewPackagePolicyInput) => input.enabled === true
  );

  if (!enabledInput) {
    return undefined;
  }

  // Determine cloud provider from input type
  const cloudProvider = enabledInput.type.match(/aws|azure/)?.[0] as CloudProvider | undefined;

  if (!cloudProvider) {
    return undefined;
  }

  // Find the enabled stream with vars
  const enabledStream = enabledInput.streams?.find((stream) => stream.enabled === true);

  if (!enabledStream?.vars) {
    return undefined;
  }

  const vars = enabledStream.vars;

  // Extract AWS credentials
  if (cloudProvider === 'aws') {
    const roleArn = vars.role_arn?.value;
    const externalId = vars.external_id?.value;

    if (!roleArn || !externalId) {
      return undefined;
    }

    return {
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

  // Extract Azure credentials
  if (cloudProvider === 'azure') {
    const tenantId = vars.azure_tenant_id?.value;
    const clientId = vars.azure_client_id?.value;
    const clientSecret = vars.azure_client_secret?.value;

    if (!tenantId || !clientId || !clientSecret) {
      return undefined;
    }

    return {
      cloudProvider: 'azure',
      vars: {
        // TODO: Add Azure-specific vars structure once Azure cloud connector types are defined
        // For now, using a generic approach that will need to be updated
        role_arn: {
          type: 'text',
          value: `tenant_id:${tenantId},client_id:${clientId}`,
        },
        external_id: {
          type: 'password',
          value: {
            isSecretRef: true,
            id: clientSecret,
          },
        },
      },
    };
  }

  return undefined;
}

/**
 * Checks if a package policy should use the cloud connector atomic API.
 * Returns true if the package policy supports cloud connectors and has the required configuration.
 *
 * @param packagePolicy - The package policy to check
 * @param selectedPolicyTab - Whether creating a new agent policy or using existing
 * @returns True if the atomic cloud connector API should be used
 */
export function shouldUseCloudConnectorAPI(
  packagePolicy: NewPackagePolicy,
  selectedPolicyTab: 'new' | 'existing'
): boolean {
  // Only use the atomic API when creating a new agent policy
  if (selectedPolicyTab !== 'new') {
    return false;
  }

  // Check if cloud connector is enabled
  if (!packagePolicy.supports_cloud_connector) {
    return false;
  }

  // Verify we can extract the required cloud connector vars
  const cloudConnectorData = extractCloudConnectorVars(packagePolicy);

  return !!cloudConnectorData;
}
