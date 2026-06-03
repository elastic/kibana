/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import gte from 'semver/functions/gte';
import { i18n } from '@kbn/i18n';

import type { PackageInfo, PackagePolicyConfigRecord } from '../../../common';
import type {
  AwsCloudConnectorVars,
  AzureCloudConnectorVars,
  GcpCloudConnectorVars,
  CloudConnectorVars,
} from '../../../common/types';

import type {
  AwsCloudConnectorCredentials,
  AzureCloudConnectorCredentials,
  GcpCloudConnectorCredentials,
  CloudConnectorCredentials,
  GetCloudConnectorRemoteRoleTemplateParams,
} from './types';
import {
  AWS_CLOUD_CONNECTOR_FIELD_NAMES,
  AZURE_CLOUD_CONNECTOR_FIELD_NAMES,
  GCP_CLOUD_CONNECTOR_FIELD_NAMES,
  CLOUD_CONNECTOR_AWS_CSPM_REUSABLE_MIN_VERSION,
  CLOUD_CONNECTOR_AWS_ASSET_INVENTORY_REUSABLE_MIN_VERSION,
  CLOUD_CONNECTOR_AZURE_CSPM_REUSABLE_MIN_VERSION,
  CLOUD_CONNECTOR_AZURE_ASSET_INVENTORY_REUSABLE_MIN_VERSION,
  AWS_PROVIDER,
  AZURE_PROVIDER,
  GCP_PROVIDER,
  TEMPLATE_URL_ACCOUNT_TYPE_ENV_VAR,
  TEMPLATE_URL_ELASTIC_RESOURCE_ID_ENV_VAR,
  SUPPORTS_CLOUD_CONNECTORS_VAR_NAME,
  CLOUD_CONNECTOR_GCP_CSPM_REUSABLE_MIN_VERSION,
  CLOUD_CONNECTOR_GCP_ASSET_INVENTORY_REUSABLE_MIN_VERSION,
} from './constants';

export type AzureCloudConnectorFieldNames =
  (typeof AZURE_CLOUD_CONNECTOR_FIELD_NAMES)[keyof typeof AZURE_CLOUD_CONNECTOR_FIELD_NAMES];

export type AwsCloudConnectorFieldNames =
  (typeof AWS_CLOUD_CONNECTOR_FIELD_NAMES)[keyof typeof AWS_CLOUD_CONNECTOR_FIELD_NAMES];

export type GcpCloudConnectorFieldNames =
  (typeof GCP_CLOUD_CONNECTOR_FIELD_NAMES)[keyof typeof GCP_CLOUD_CONNECTOR_FIELD_NAMES];

// Cloud connector name validation constants
export const CLOUD_CONNECTOR_NAME_MAX_LENGTH = 255;

/**
 * Validates a cloud connector name
 * @param name - The name to validate
 * @returns true if the name is valid, false otherwise
 */
export const isCloudConnectorNameValid = (name: string | undefined): boolean => {
  if (!name) return false;
  const trimmedLength = name.trim().length;
  return trimmedLength > 0 && name.length <= CLOUD_CONNECTOR_NAME_MAX_LENGTH;
};

/**
 * Gets the validation error message for a cloud connector name
 * @param name - The name to validate
 * @returns Error message string or undefined if valid
 */
export const getCloudConnectorNameError = (name: string | undefined): string | undefined => {
  if (!name || name.trim().length === 0) {
    return i18n.translate('xpack.fleet.cloudConnector.nameValidation.requiredError', {
      defaultMessage: 'Federated Identity Name is required',
    });
  }
  if (name.length > CLOUD_CONNECTOR_NAME_MAX_LENGTH) {
    return i18n.translate('xpack.fleet.cloudConnector.nameValidation.tooLongError', {
      defaultMessage: 'Federated Identity Name must be {maxLength} characters or less',
      values: { maxLength: CLOUD_CONNECTOR_NAME_MAX_LENGTH },
    });
  }
  return undefined;
};

export const isAwsCloudConnectorVars = (
  vars: CloudConnectorVars,
  provider: string
): vars is AwsCloudConnectorVars => {
  return (
    (AWS_CLOUD_CONNECTOR_FIELD_NAMES.ROLE_ARN in vars ||
      AWS_CLOUD_CONNECTOR_FIELD_NAMES.AWS_ROLE_ARN in vars) &&
    provider === AWS_PROVIDER
  );
};

export function isAwsCredentials(
  credentials: CloudConnectorCredentials
): credentials is AwsCloudConnectorCredentials {
  return 'roleArn' in credentials;
}

export const isAzureCloudConnectorVars = (
  vars: CloudConnectorVars | PackagePolicyConfigRecord,
  provider: string
): vars is AzureCloudConnectorVars => {
  return (
    (AZURE_CLOUD_CONNECTOR_FIELD_NAMES.TENANT_ID in vars ||
      AZURE_CLOUD_CONNECTOR_FIELD_NAMES.AZURE_TENANT_ID in vars) &&
    provider === AZURE_PROVIDER
  );
};

export function isAzureCredentials(
  credentials: CloudConnectorCredentials
): credentials is AzureCloudConnectorCredentials {
  return 'tenantId' in credentials;
}

export const isGcpCloudConnectorVars = (
  vars: CloudConnectorVars | PackagePolicyConfigRecord,
  provider: string
): vars is GcpCloudConnectorVars => {
  return (
    (GCP_CLOUD_CONNECTOR_FIELD_NAMES.SERVICE_ACCOUNT in vars ||
      GCP_CLOUD_CONNECTOR_FIELD_NAMES.GCP_SERVICE_ACCOUNT in vars) &&
    (GCP_CLOUD_CONNECTOR_FIELD_NAMES.AUDIENCE in vars ||
      GCP_CLOUD_CONNECTOR_FIELD_NAMES.GCP_AUDIENCE in vars) &&
    provider === GCP_PROVIDER
  );
};

export function isGcpCredentials(
  credentials: CloudConnectorCredentials
): credentials is GcpCloudConnectorCredentials {
  return 'serviceAccount' in credentials;
}

export function hasValidNewConnectionCredentials(
  credentials: CloudConnectorCredentials,
  provider?: string
): boolean {
  if (!provider) return false;

  switch (provider) {
    case AWS_PROVIDER:
      return isAwsCredentials(credentials) && !!credentials.roleArn;
    case AZURE_PROVIDER:
      return isAzureCredentials(credentials) && !!credentials.tenantId;
    case GCP_PROVIDER:
      return isGcpCredentials(credentials) && !!credentials.serviceAccount;
    default:
      return false;
  }
}

export const getDeploymentIdFromUrl = (url: string | undefined): string | undefined => {
  if (!url) return undefined;
  const match = url.match(/\/deployments\/([^/?#]+)/);
  return match?.[1];
};

export const getKibanaComponentId = (cloudId: string | undefined): string | undefined => {
  if (!cloudId) return undefined;

  try {
    const base64Part = cloudId.split(':')[1];
    if (!base64Part) return undefined;

    const decoded = atob(base64Part);
    const [, , kibanaComponentId] = decoded.split('$');

    return kibanaComponentId || undefined;
  } catch (error) {
    return undefined;
  }
};

export const getTemplateUrlFromPackageInfo = (
  packageInfo: PackageInfo | undefined,
  integrationType: string,
  templateUrlFieldName: string
): string | undefined => {
  if (!packageInfo?.policy_templates) return undefined;

  const policyTemplate = packageInfo.policy_templates.find((p) => p.name === integrationType);
  if (!policyTemplate) return undefined;

  if ('inputs' in policyTemplate) {
    const cloudFormationTemplate = policyTemplate.inputs?.reduce((acc, input): string => {
      if (!input.vars) return acc;
      const template = input.vars.find((v) => v.name === templateUrlFieldName)?.default;
      return template ? String(template) : acc;
    }, '');
    return cloudFormationTemplate !== '' ? cloudFormationTemplate : undefined;
  }
};

export const getCloudConnectorRemoteRoleTemplate = ({
  cloud,
  accountType,
  iacTemplateUrl,
}: GetCloudConnectorRemoteRoleTemplateParams): string | undefined => {
  let elasticResourceId: string | undefined;
  const deploymentId = getDeploymentIdFromUrl(cloud?.deploymentUrl);
  const kibanaComponentId = getKibanaComponentId(cloud?.cloudId);

  if (cloud?.isServerlessEnabled && cloud?.serverless?.projectId) {
    elasticResourceId = cloud.serverless.projectId;
  }

  if (cloud?.isCloudEnabled && deploymentId && kibanaComponentId) {
    elasticResourceId = kibanaComponentId;
  }

  if (!elasticResourceId || !accountType || !iacTemplateUrl) return undefined;

  return iacTemplateUrl
    .replace(TEMPLATE_URL_ACCOUNT_TYPE_ENV_VAR, accountType)
    .replace(TEMPLATE_URL_ELASTIC_RESOURCE_ID_ENV_VAR, elasticResourceId);
};

/**
 * Updates input variables with AWS credentials
 */
export const updateInputVarsWithAwsCredentials = (
  inputVars: PackagePolicyConfigRecord | undefined,
  inputCredentials: AwsCloudConnectorCredentials | undefined
): PackagePolicyConfigRecord | undefined => {
  if (!inputVars) return inputVars;

  const updatedInputVars: PackagePolicyConfigRecord = { ...inputVars };

  if (inputCredentials?.roleArn !== undefined) {
    if (updatedInputVars.role_arn) {
      updatedInputVars.role_arn = {
        ...updatedInputVars.role_arn,
        value: inputCredentials.roleArn,
      };
    }
    if (updatedInputVars[AWS_CLOUD_CONNECTOR_FIELD_NAMES.AWS_ROLE_ARN]) {
      updatedInputVars[AWS_CLOUD_CONNECTOR_FIELD_NAMES.AWS_ROLE_ARN] = {
        ...updatedInputVars[AWS_CLOUD_CONNECTOR_FIELD_NAMES.AWS_ROLE_ARN],
        value: inputCredentials.roleArn,
      };
    }
  } else {
    if (updatedInputVars.role_arn) {
      updatedInputVars.role_arn = { value: undefined };
    }
    if (updatedInputVars[AWS_CLOUD_CONNECTOR_FIELD_NAMES.AWS_ROLE_ARN]) {
      updatedInputVars[AWS_CLOUD_CONNECTOR_FIELD_NAMES.AWS_ROLE_ARN] = { value: undefined };
    }
  }

  if (inputCredentials?.externalId !== undefined) {
    if (updatedInputVars.external_id) {
      updatedInputVars.external_id = { value: inputCredentials.externalId };
    }
    if (updatedInputVars[AWS_CLOUD_CONNECTOR_FIELD_NAMES.AWS_EXTERNAL_ID]) {
      updatedInputVars[AWS_CLOUD_CONNECTOR_FIELD_NAMES.AWS_EXTERNAL_ID] = {
        value: inputCredentials.externalId,
      };
    }
  } else {
    if (updatedInputVars.external_id) {
      updatedInputVars.external_id = { value: undefined };
    }
    if (updatedInputVars[AWS_CLOUD_CONNECTOR_FIELD_NAMES.AWS_EXTERNAL_ID]) {
      updatedInputVars[AWS_CLOUD_CONNECTOR_FIELD_NAMES.AWS_EXTERNAL_ID] = { value: undefined };
    }
  }

  return updatedInputVars;
};

/**
 * Updates input variables with Azure credentials
 */
export const updateInputVarsWithAzureCredentials = (
  inputVars: PackagePolicyConfigRecord | undefined,
  credentials: AzureCloudConnectorCredentials | undefined
): PackagePolicyConfigRecord | undefined => {
  if (!inputVars) return inputVars;

  const updatedInputVars: PackagePolicyConfigRecord = { ...inputVars };

  if (credentials?.tenantId !== undefined) {
    if (updatedInputVars[AZURE_CLOUD_CONNECTOR_FIELD_NAMES.TENANT_ID]) {
      updatedInputVars[AZURE_CLOUD_CONNECTOR_FIELD_NAMES.TENANT_ID] = {
        ...updatedInputVars[AZURE_CLOUD_CONNECTOR_FIELD_NAMES.TENANT_ID],
        value: credentials.tenantId,
      };
    }
    if (updatedInputVars[AZURE_CLOUD_CONNECTOR_FIELD_NAMES.AZURE_TENANT_ID]) {
      updatedInputVars[AZURE_CLOUD_CONNECTOR_FIELD_NAMES.AZURE_TENANT_ID] = {
        ...updatedInputVars[AZURE_CLOUD_CONNECTOR_FIELD_NAMES.AZURE_TENANT_ID],
        value: credentials.tenantId,
      };
    }
  } else {
    if (updatedInputVars[AZURE_CLOUD_CONNECTOR_FIELD_NAMES.TENANT_ID]) {
      updatedInputVars[AZURE_CLOUD_CONNECTOR_FIELD_NAMES.TENANT_ID] = { value: undefined };
    }
    if (updatedInputVars[AZURE_CLOUD_CONNECTOR_FIELD_NAMES.AZURE_TENANT_ID]) {
      updatedInputVars[AZURE_CLOUD_CONNECTOR_FIELD_NAMES.AZURE_TENANT_ID] = { value: undefined };
    }
  }

  if (credentials?.clientId !== undefined) {
    if (updatedInputVars[AZURE_CLOUD_CONNECTOR_FIELD_NAMES.CLIENT_ID]) {
      updatedInputVars[AZURE_CLOUD_CONNECTOR_FIELD_NAMES.CLIENT_ID] = {
        ...updatedInputVars[AZURE_CLOUD_CONNECTOR_FIELD_NAMES.CLIENT_ID],
        value: credentials.clientId,
      };
    }
    if (updatedInputVars[AZURE_CLOUD_CONNECTOR_FIELD_NAMES.AZURE_CLIENT_ID]) {
      updatedInputVars[AZURE_CLOUD_CONNECTOR_FIELD_NAMES.AZURE_CLIENT_ID] = {
        ...updatedInputVars[AZURE_CLOUD_CONNECTOR_FIELD_NAMES.AZURE_CLIENT_ID],
        value: credentials.clientId,
      };
    }
  } else {
    if (updatedInputVars[AZURE_CLOUD_CONNECTOR_FIELD_NAMES.CLIENT_ID]) {
      updatedInputVars[AZURE_CLOUD_CONNECTOR_FIELD_NAMES.CLIENT_ID] = { value: undefined };
    }
    if (updatedInputVars[AZURE_CLOUD_CONNECTOR_FIELD_NAMES.AZURE_CLIENT_ID]) {
      updatedInputVars[AZURE_CLOUD_CONNECTOR_FIELD_NAMES.AZURE_CLIENT_ID] = { value: undefined };
    }
  }

  if (credentials?.azure_credentials_cloud_connector_id !== undefined) {
    if (updatedInputVars[AZURE_CLOUD_CONNECTOR_FIELD_NAMES.AZURE_CREDENTIALS_CLOUD_CONNECTOR_ID]) {
      updatedInputVars[AZURE_CLOUD_CONNECTOR_FIELD_NAMES.AZURE_CREDENTIALS_CLOUD_CONNECTOR_ID] = {
        ...updatedInputVars[AZURE_CLOUD_CONNECTOR_FIELD_NAMES.AZURE_CREDENTIALS_CLOUD_CONNECTOR_ID],
        value: credentials.azure_credentials_cloud_connector_id,
      };
    } else {
      updatedInputVars[AZURE_CLOUD_CONNECTOR_FIELD_NAMES.AZURE_CREDENTIALS_CLOUD_CONNECTOR_ID] = {
        value: credentials.azure_credentials_cloud_connector_id,
      };
    }
  } else {
    if (updatedInputVars[AZURE_CLOUD_CONNECTOR_FIELD_NAMES.AZURE_CREDENTIALS_CLOUD_CONNECTOR_ID]) {
      updatedInputVars[AZURE_CLOUD_CONNECTOR_FIELD_NAMES.AZURE_CREDENTIALS_CLOUD_CONNECTOR_ID] = {
        value: undefined,
      };
    }
  }

  return updatedInputVars;
};

/**
 * Updates input variables with GCP credentials
 */
export const updateInputVarsWithGcpCredentials = (
  inputVars: PackagePolicyConfigRecord | undefined,
  credentials: GcpCloudConnectorCredentials | undefined
): PackagePolicyConfigRecord | undefined => {
  if (!inputVars) return inputVars;

  const updatedInputVars: PackagePolicyConfigRecord = { ...inputVars };

  if (credentials?.serviceAccount !== undefined) {
    if (updatedInputVars[GCP_CLOUD_CONNECTOR_FIELD_NAMES.SERVICE_ACCOUNT]) {
      updatedInputVars[GCP_CLOUD_CONNECTOR_FIELD_NAMES.SERVICE_ACCOUNT] = {
        ...updatedInputVars[GCP_CLOUD_CONNECTOR_FIELD_NAMES.SERVICE_ACCOUNT],
        value: credentials.serviceAccount,
      };
    }
    if (updatedInputVars[GCP_CLOUD_CONNECTOR_FIELD_NAMES.GCP_SERVICE_ACCOUNT]) {
      updatedInputVars[GCP_CLOUD_CONNECTOR_FIELD_NAMES.GCP_SERVICE_ACCOUNT] = {
        ...updatedInputVars[GCP_CLOUD_CONNECTOR_FIELD_NAMES.GCP_SERVICE_ACCOUNT],
        value: credentials.serviceAccount,
      };
    }
  } else {
    if (updatedInputVars[GCP_CLOUD_CONNECTOR_FIELD_NAMES.SERVICE_ACCOUNT]) {
      updatedInputVars[GCP_CLOUD_CONNECTOR_FIELD_NAMES.SERVICE_ACCOUNT] = { value: undefined };
    }
    if (updatedInputVars[GCP_CLOUD_CONNECTOR_FIELD_NAMES.GCP_SERVICE_ACCOUNT]) {
      updatedInputVars[GCP_CLOUD_CONNECTOR_FIELD_NAMES.GCP_SERVICE_ACCOUNT] = { value: undefined };
    }
  }

  if (credentials?.audience !== undefined) {
    if (updatedInputVars[GCP_CLOUD_CONNECTOR_FIELD_NAMES.AUDIENCE]) {
      updatedInputVars[GCP_CLOUD_CONNECTOR_FIELD_NAMES.AUDIENCE] = {
        ...updatedInputVars[GCP_CLOUD_CONNECTOR_FIELD_NAMES.AUDIENCE],
        value: credentials.audience,
      };
    }
    if (updatedInputVars[GCP_CLOUD_CONNECTOR_FIELD_NAMES.GCP_AUDIENCE]) {
      updatedInputVars[GCP_CLOUD_CONNECTOR_FIELD_NAMES.GCP_AUDIENCE] = {
        ...updatedInputVars[GCP_CLOUD_CONNECTOR_FIELD_NAMES.GCP_AUDIENCE],
        value: credentials.audience,
      };
    }
  } else {
    if (updatedInputVars[GCP_CLOUD_CONNECTOR_FIELD_NAMES.AUDIENCE]) {
      updatedInputVars[GCP_CLOUD_CONNECTOR_FIELD_NAMES.AUDIENCE] = { value: undefined };
    }
    if (updatedInputVars[GCP_CLOUD_CONNECTOR_FIELD_NAMES.GCP_AUDIENCE]) {
      updatedInputVars[GCP_CLOUD_CONNECTOR_FIELD_NAMES.GCP_AUDIENCE] = { value: undefined };
    }
  }

  if (credentials?.gcp_credentials_cloud_connector_id !== undefined) {
    if (updatedInputVars[GCP_CLOUD_CONNECTOR_FIELD_NAMES.GCP_CREDENTIALS_CLOUD_CONNECTOR_ID]) {
      updatedInputVars[GCP_CLOUD_CONNECTOR_FIELD_NAMES.GCP_CREDENTIALS_CLOUD_CONNECTOR_ID] = {
        ...updatedInputVars[GCP_CLOUD_CONNECTOR_FIELD_NAMES.GCP_CREDENTIALS_CLOUD_CONNECTOR_ID],
        value: credentials.gcp_credentials_cloud_connector_id,
      };
    } else {
      updatedInputVars[GCP_CLOUD_CONNECTOR_FIELD_NAMES.GCP_CREDENTIALS_CLOUD_CONNECTOR_ID] = {
        value: credentials.gcp_credentials_cloud_connector_id,
      };
    }
  } else {
    if (updatedInputVars[GCP_CLOUD_CONNECTOR_FIELD_NAMES.GCP_CREDENTIALS_CLOUD_CONNECTOR_ID]) {
      updatedInputVars[GCP_CLOUD_CONNECTOR_FIELD_NAMES.GCP_CREDENTIALS_CLOUD_CONNECTOR_ID] = {
        value: undefined,
      };
    }
  }

  return updatedInputVars;
};

/**
 * Updates input variables with current credentials
 */
export const updateInputVarsWithCredentials = (
  inputVars: PackagePolicyConfigRecord | undefined,
  credentials: CloudConnectorCredentials | undefined
): PackagePolicyConfigRecord | undefined => {
  if (!inputVars) return inputVars;

  let updatedVars: PackagePolicyConfigRecord | undefined;

  // If credentials is undefined, clear all credential fields (AWS, Azure, and GCP)
  if (!credentials) {
    updatedVars = updateInputVarsWithAwsCredentials(inputVars, undefined);
    updatedVars = updateInputVarsWithAzureCredentials(updatedVars, undefined);
    updatedVars = updateInputVarsWithGcpCredentials(updatedVars, undefined);
  } else if (isAwsCredentials(credentials)) {
    updatedVars = updateInputVarsWithAwsCredentials(inputVars, credentials);
  } else if (isAzureCredentials(credentials)) {
    updatedVars = updateInputVarsWithAzureCredentials(inputVars, credentials);
  } else if (isGcpCredentials(credentials)) {
    updatedVars = updateInputVarsWithGcpCredentials(inputVars, credentials);
  } else {
    updatedVars = inputVars;
  }

  // Set supports_cloud_connectors flag if the var exists in the record.
  if (updatedVars && SUPPORTS_CLOUD_CONNECTORS_VAR_NAME in updatedVars) {
    updatedVars = {
      ...updatedVars,
      [SUPPORTS_CLOUD_CONNECTORS_VAR_NAME]: {
        ...updatedVars[SUPPORTS_CLOUD_CONNECTORS_VAR_NAME],
        value: !!credentials,
      },
    };
  }

  return updatedVars;
};

export const isCloudConnectorReusableEnabled = (
  provider: string,
  packageInfoVersion: string,
  templateName: string
) => {
  if (provider === AWS_PROVIDER) {
    if (templateName === 'cspm') {
      return gte(packageInfoVersion, CLOUD_CONNECTOR_AWS_CSPM_REUSABLE_MIN_VERSION);
    }
    if (templateName === 'asset_inventory') {
      return gte(packageInfoVersion, CLOUD_CONNECTOR_AWS_ASSET_INVENTORY_REUSABLE_MIN_VERSION);
    }

    if (templateName === 'aws') {
      return true;
    }
  } else if (provider === AZURE_PROVIDER) {
    if (templateName === 'cspm') {
      return gte(packageInfoVersion, CLOUD_CONNECTOR_AZURE_CSPM_REUSABLE_MIN_VERSION);
    }
    if (templateName === 'asset_inventory') {
      return gte(packageInfoVersion, CLOUD_CONNECTOR_AZURE_ASSET_INVENTORY_REUSABLE_MIN_VERSION);
    }
  } else if (provider === GCP_PROVIDER) {
    if (templateName === 'cspm') {
      return gte(packageInfoVersion, CLOUD_CONNECTOR_GCP_CSPM_REUSABLE_MIN_VERSION);
    }
    if (templateName === 'asset_inventory') {
      return gte(packageInfoVersion, CLOUD_CONNECTOR_GCP_ASSET_INVENTORY_REUSABLE_MIN_VERSION);
    }
  }

  return false;
};

/**
 * Find a variable definition from package info
 */
export const findVariableDef = (packageInfo: PackageInfo, key: string) => {
  const packageLevelVar = packageInfo?.vars?.find((v) => v?.name === key);
  if (packageLevelVar) {
    return packageLevelVar;
  }

  return packageInfo?.data_streams
    ?.filter((datastreams) => datastreams !== undefined)
    .map((ds) => ds.streams)
    .flat()
    .map((s) => s?.vars)
    .flat()
    .filter((vars) => vars !== undefined)
    .find((vars) => vars?.name === key);
};

export const fieldIsInvalid = (value: string | undefined, hasInvalidRequiredVars: boolean) =>
  hasInvalidRequiredVars && !value;
