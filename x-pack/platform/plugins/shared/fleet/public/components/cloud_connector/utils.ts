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
  CloudProvider,
} from '../../../common/types';
import { isCloudProvider } from '../../../common/types';
import {
  getIacTemplateUrlFromVarGroupSelection,
  getAwsConsoleHostFromArn,
  isCloudFormationStackArn,
  parseAwsRegionFromArn,
} from '../../../common/services/cloud_connectors';

import type {
  AwsCloudConnectorCredentials,
  AzureCloudConnectorCredentials,
  GcpCloudConnectorCredentials,
  CloudConnectorCredentials,
  CloudProviders,
  CloudSetupForCloudConnector,
  GetCloudConnectorRemoteRoleTemplateParams,
} from './types';
import type { AccountType } from '../../types';
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
  TEMPLATE_URL_ELASTIC_RESOURCE_TYPE_ENV_VAR,
  TEMPLATE_URL_ELASTIC_ORGANIZATION_ID_ENV_VAR,
  TEMPLATE_URL_CLOUD_PROVIDER_ENV_VAR,
  TEMPLATE_URL_CLOUD_REGION_ENV_VAR,
  TEMPLATE_URL_CLOUD_ENVIRONMENT_ENV_VAR,
  TEMPLATE_URL_TOKENS,
  ELASTIC_RESOURCE_TYPE_DEPLOYMENT,
  ELASTIC_RESOURCE_TYPE_PROJECT,
  ELASTIC_CLOUD_ENVIRONMENT_PRODUCTION,
  ELASTIC_CLOUD_ENVIRONMENT_STAGING,
  ELASTIC_CLOUD_ENVIRONMENT_QA,
  SUPPORTS_CLOUD_CONNECTORS_VAR_NAME,
  CLOUD_CONNECTOR_GCP_CSPM_REUSABLE_MIN_VERSION,
  CLOUD_CONNECTOR_GCP_ASSET_INVENTORY_REUSABLE_MIN_VERSION,
} from './constants';
import type { ElasticCloudEnvironment, ElasticResourceType, TemplateUrlToken } from './constants';

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

// <host>[:<port>]$<es component id>$<kibana component id>
const decodeCloudIdParts = (cloudId: string | undefined): string[] | undefined => {
  if (!cloudId) return undefined;

  try {
    const base64Part = cloudId.split(':')[1];
    if (!base64Part) return undefined;

    return atob(base64Part).split('$');
  } catch (error) {
    return undefined;
  }
};

export const getKibanaComponentId = (cloudId: string | undefined): string | undefined => {
  const [, , kibanaComponentId] = decodeCloudIdParts(cloudId) ?? [];
  return kibanaComponentId || undefined;
};

export const getCloudHostFromCloudId = (cloudId: string | undefined): string | undefined => {
  const [hostWithPort] = decodeCloudIdParts(cloudId) ?? [];
  const host = hostWithPort?.split(':')[0];
  return host || undefined;
};

export interface ElasticCloudHostInfo {
  region?: string;
  csp?: CloudProvider;
}

const REGION_LABEL_REGEX = /^[a-z0-9-]+$/;

const normalizeRegion = (region: string | undefined): string | undefined => {
  const value = region?.trim().toLowerCase();
  return value && REGION_LABEL_REGEX.test(value) ? value : undefined;
};

const getHostname = (url: string | undefined): string | undefined => {
  if (!url) return undefined;
  try {
    return new URL(url).hostname || undefined;
  } catch (error) {
    return undefined;
  }
};

export const getElasticCloudEnvironmentFromHost = (
  host: string | undefined
): ElasticCloudEnvironment | undefined => {
  if (!host) return undefined;
  const labels = host.toLowerCase().split('.');
  if (labels.includes(ELASTIC_CLOUD_ENVIRONMENT_QA)) return ELASTIC_CLOUD_ENVIRONMENT_QA;
  if (labels.includes(ELASTIC_CLOUD_ENVIRONMENT_STAGING)) return ELASTIC_CLOUD_ENVIRONMENT_STAGING;
  return ELASTIC_CLOUD_ENVIRONMENT_PRODUCTION;
};

// <region>.<csp>.<domain>
export const parseElasticCloudHost = (
  host: string | undefined
): ElasticCloudHostInfo | undefined => {
  if (!host) return undefined;
  const labels = host.toLowerCase().split(':')[0].split('.').filter(Boolean);
  if (labels.length < 3) return undefined;

  const [region, csp] = labels;
  return {
    region: normalizeRegion(region),
    csp: isCloudProvider(csp) ? csp : undefined,
  };
};

export interface ElasticResource {
  type: ElasticResourceType;
  /** Kibana component ID on ECH, project ID on serverless. */
  id?: string;
}

export const getElasticResource = (
  cloud: CloudSetupForCloudConnector | undefined
): ElasticResource => {
  // The cloud plugin derives deploymentId with split('/').pop(), which is empty for a
  // deployment_url that ends in a slash; the URL parser still finds the id in that case.
  const deploymentId = cloud?.deploymentId || getDeploymentIdFromUrl(cloud?.deploymentUrl);
  const kibanaComponentId = getKibanaComponentId(cloud?.cloudId);

  if (cloud?.isCloudEnabled && deploymentId && kibanaComponentId) {
    return { type: ELASTIC_RESOURCE_TYPE_DEPLOYMENT, id: kibanaComponentId };
  }
  if (cloud?.isServerlessEnabled && cloud?.serverless?.projectId) {
    return { type: ELASTIC_RESOURCE_TYPE_PROJECT, id: cloud.serverless.projectId };
  }
  return {
    type: cloud?.isServerlessEnabled
      ? ELASTIC_RESOURCE_TYPE_PROJECT
      : ELASTIC_RESOURCE_TYPE_DEPLOYMENT,
  };
};

export interface ElasticCloudTemplateContext {
  resourceType: ElasticResourceType;
  resourceId?: string;
  organizationId?: string;
  cloudProvider?: CloudProvider;
  cloudRegion?: string;
  cloudEnvironment: ElasticCloudEnvironment;
}

export const getElasticCloudTemplateContext = (
  cloud: CloudSetupForCloudConnector | undefined
): ElasticCloudTemplateContext => {
  const host = cloud?.cloudHost || getCloudHostFromCloudId(cloud?.cloudId);
  const hostInfo = parseElasticCloudHost(host);
  const resource = getElasticResource(cloud);
  const configuredCsp = cloud?.csp;

  return {
    resourceType: resource.type,
    resourceId: resource.id,
    organizationId: cloud?.organizationId || undefined,
    cloudProvider: isCloudProvider(configuredCsp) ? configuredCsp : hostInfo?.csp,
    cloudRegion: normalizeRegion(cloud?.region) || hostInfo?.region,
    cloudEnvironment:
      getElasticCloudEnvironmentFromHost(host) ??
      getElasticCloudEnvironmentFromHost(getHostname(cloud?.baseUrl)) ??
      ELASTIC_CLOUD_ENVIRONMENT_PRODUCTION,
  };
};

export const getTemplateUrlTokens = (iacTemplateUrl: string | undefined): TemplateUrlToken[] =>
  iacTemplateUrl ? TEMPLATE_URL_TOKENS.filter((token) => iacTemplateUrl.includes(token)) : [];

const getTemplateTokenValues = (
  cloud: CloudSetupForCloudConnector | undefined,
  accountType: AccountType | undefined
): Record<TemplateUrlToken, string | undefined> => {
  const context = getElasticCloudTemplateContext(cloud);
  return {
    [TEMPLATE_URL_ACCOUNT_TYPE_ENV_VAR]: accountType,
    [TEMPLATE_URL_ELASTIC_RESOURCE_ID_ENV_VAR]: context.resourceId,
    [TEMPLATE_URL_ELASTIC_RESOURCE_TYPE_ENV_VAR]: context.resourceType,
    [TEMPLATE_URL_ELASTIC_ORGANIZATION_ID_ENV_VAR]: context.organizationId,
    [TEMPLATE_URL_CLOUD_PROVIDER_ENV_VAR]: context.cloudProvider,
    [TEMPLATE_URL_CLOUD_REGION_ENV_VAR]: context.cloudRegion,
    [TEMPLATE_URL_CLOUD_ENVIRONMENT_ENV_VAR]: context.cloudEnvironment,
  };
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

/**
 * Searches a package for the cloud connectors IAC template URL without a specific
 * policy template name or var_group selection. Selects whichever option in each
 * var_group has a cloud provider (the newer AWS-package format).
 *
 * TODO: When multiple selected services support federated identity, a combined
 * CloudFormation template will be needed rather than a single per-package URL.
 */
export const getAnyCloudConnectorIacTemplateUrl = (
  packageInfo: PackageInfo | undefined
): string | undefined => {
  const varGroups = packageInfo?.var_groups;
  if (!varGroups?.length) return undefined;
  // Build a synthetic selection that picks the cloud connector option in each var_group.
  const selections: Record<string, string> = {};
  for (const group of varGroups) {
    const cloudOption = group.options.find((o) => isCloudProvider(o.provider));
    if (cloudOption) selections[group.name] = cloudOption.name;
  }
  return getIacTemplateUrlFromVarGroupSelection(varGroups, selections);
};

/** Tokens in the template URL that cannot be filled from the cloud contract. */
export const getUnresolvedTemplateUrlTokens = ({
  cloud,
  accountType,
  iacTemplateUrl,
}: GetCloudConnectorRemoteRoleTemplateParams): TemplateUrlToken[] => {
  const values = getTemplateTokenValues(cloud, accountType);
  return getTemplateUrlTokens(iacTemplateUrl).filter((token) => !values[token]);
};

export const getCloudConnectorRemoteRoleTemplate = ({
  cloud,
  accountType,
  iacTemplateUrl,
}: GetCloudConnectorRemoteRoleTemplateParams): string | undefined => {
  if (!iacTemplateUrl) return undefined;

  const values = getTemplateTokenValues(cloud, accountType);

  return getTemplateUrlTokens(iacTemplateUrl).reduce<string | undefined>((url, token) => {
    const value = values[token];
    if (url === undefined || !value) return undefined;
    return url.split(token).join(encodeURIComponent(value));
  }, iacTemplateUrl);
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

  // Any other integration reaching this point uses Fleet's var_groups UI, which only
  // renders cloud connector setup when the package manifest declares identity
  // federation support — so reuse is enabled for every valid provider without
  // requiring per-package registration in Kibana.
  return isCloudProvider(provider);
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

// IaC launch URL helpers

const TEMPLATE_URL_PARAM_REGEX = /templateURL=[^&]+/;

/** Returns true when a URL carries a `templateURL=` query parameter. */
export const hasTemplateUrlParam = (url: string | undefined): boolean =>
  Boolean(url && TEMPLATE_URL_PARAM_REGEX.test(url));

export interface IacLaunchUrlParams {
  provider: CloudProviders;
  /** Static quick-create URL from the package manifest (token-substituted). */
  staticUrl: string | undefined;
  /** Pre-signed artifact URL from IaCP — embeds credentials, never persist it. */
  artifactUrl: string;
  /**
   * Provider deployment identity; AWS: CloudFormation stack ARN. When set, the result is a
   * stack-update deep link. A malformed ARN (no parseable region) returns undefined.
   */
  deploymentId?: string;
}

/**
 * Per-provider seam for turning a rendered artifact into a console launch URL.
 * Only AWS is implemented: IaCP has no Azure/GCP blueprints yet.
 */
export const getIacLaunchUrl = ({
  provider,
  staticUrl,
  artifactUrl,
  deploymentId,
}: IacLaunchUrlParams): string | undefined => {
  if (provider !== AWS_PROVIDER) {
    return undefined;
  }
  const encodedArtifact = encodeURIComponent(artifactUrl);
  if (deploymentId) {
    // Only a CloudFormation stack ARN can be updated: a region alone does not make one (a
    // CloudWatch Logs ARN has a region too), so the same validator the fields and the API use
    // gates the link. A malformed value, a non-stack ARN, or a partition with no public console
    // means there is no stack to link to; do not fall through to the quick-create path or a new
    // stack would be created.
    const region = parseAwsRegionFromArn(deploymentId);
    const host = getAwsConsoleHostFromArn(deploymentId);
    if (!isCloudFormationStackArn(deploymentId) || !region || !host) {
      return undefined;
    }
    // Console deep link on the ARN's own partition (GovCloud and China have their own console
    // hosts). AWS does not document this format; it must be verified manually against the
    // console before shipping.
    return `https://${host}/cloudformation/home?region=${region}#/stacks/update/template?stackId=${encodeURIComponent(
      deploymentId
    )}&templateURL=${encodedArtifact}`;
  }
  if (!staticUrl || !hasTemplateUrlParam(staticUrl)) {
    return undefined;
  }
  return staticUrl.replace(TEMPLATE_URL_PARAM_REGEX, `templateURL=${encodedArtifact}`);
};

/** Stack ARN field copy shared by the wizard's connector form and the AWS onboarding setup. */
export const STACK_ARN_LABEL = i18n.translate('xpack.fleet.cloudConnector.aws.stackArnLabel', {
  defaultMessage: 'CloudFormation stack ARN',
});

export const STACK_ARN_HELP_TEXT = i18n.translate('xpack.fleet.cloudConnector.aws.stackArnHelp', {
  defaultMessage:
    'Copy the StackId output of the stack you just created so Kibana can link straight to it.',
});

/** Shared by the wizard's stack ARN field and the flyout's Deployment ID field. */
export const INVALID_STACK_ARN_MESSAGE = i18n.translate(
  'xpack.fleet.cloudConnector.aws.stackArnInvalid',
  {
    defaultMessage:
      'Enter a CloudFormation stack ARN, for example arn:aws:cloudformation:us-east-1:123456789012:stack/my-stack/…',
  }
);

/**
 * True for a non-empty value that is not a CloudFormation stack ARN (any other regional ARN, such
 * as a CloudWatch Logs group, is rejected too); whitespace is ignored so a pasted value is judged
 * as it will be saved. Same rule as the connector API's `iac_deployment_id`.
 */
export const isStackArnInvalid = (stackArn: string | undefined): boolean => {
  const trimmed = stackArn?.trim() ?? '';
  return trimmed !== '' && !isCloudFormationStackArn(trimmed);
};

/** Read-only link to the deployed stack; needs no render. */
export const getAwsStackConsoleUrl = (deploymentId: string | undefined): string | undefined => {
  const region = parseAwsRegionFromArn(deploymentId);
  const host = getAwsConsoleHostFromArn(deploymentId);
  // A stored legacy value may predate validation; never link a non-stack ARN as a stack.
  if (!deploymentId || !isCloudFormationStackArn(deploymentId) || !region || !host) {
    return undefined;
  }
  // Console deep link on the ARN's own partition. AWS does not document this format; it must be
  // verified manually against the console before shipping.
  return `https://${host}/cloudformation/home?region=${region}#/stacks/stackinfo?stackId=${encodeURIComponent(
    deploymentId
  )}`;
};
