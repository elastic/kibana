/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AwsCloudConnectorVars,
  AzureCloudConnectorVars,
  CloudConnectorVars,
} from '../types/models/cloud_connector';

/**
 * Type guard to check if vars object contains AWS cloud connector variables
 */
export function isAwsCloudConnectorVars(
  vars: Partial<CloudConnectorVars>
): vars is AwsCloudConnectorVars {
  const awsVars = vars as Partial<AwsCloudConnectorVars>;
  return !!(awsVars.role_arn && awsVars.external_id);
}

/**
 * Type guard to check if vars object contains Azure cloud connector variables
 */
export function isAzureCloudConnectorVars(
  vars: Partial<CloudConnectorVars>
): vars is AzureCloudConnectorVars {
  const azureVars = vars as Partial<AzureCloudConnectorVars>;
  return !!(
    azureVars.tenant_id &&
    azureVars.client_id &&
    azureVars.azure_credentials_cloud_connector_id
  );
}
