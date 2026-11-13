/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { AccountType, CloudProvider } from '../../types';
import { isCloudProvider } from '../../types';

import {
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
} from './constants';
import type { ElasticCloudEnvironment, ElasticResourceType, TemplateUrlToken } from './constants';

/**
 * The subset of the Cloud plugin contract (public or server) used to derive template values.
 * `deploymentUrl` is only available in the browser.
 */
export interface CloudSetupForCloudConnector {
  isCloudEnabled?: boolean;
  isServerlessEnabled?: boolean;
  cloudId?: string;
  cloudHost?: string;
  baseUrl?: string;
  deploymentUrl?: string;
  deploymentId?: string;
  organizationId?: string;
  csp?: string;
  region?: string;
  serverless?: { projectId?: string };
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

export const normalizeRegion = (region: string | undefined): string | undefined => {
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

  // Serverless projects also carry a deploymentId (the project ID) and a `<projectId>.kb`
  // Kibana component in the cloud ID, so the project check must come first.
  if (cloud?.isServerlessEnabled && cloud?.serverless?.projectId) {
    return { type: ELASTIC_RESOURCE_TYPE_PROJECT, id: cloud.serverless.projectId };
  }
  if (cloud?.isCloudEnabled && deploymentId && kibanaComponentId) {
    return { type: ELASTIC_RESOURCE_TYPE_DEPLOYMENT, id: kibanaComponentId };
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

export const getTemplateTokenValues = (
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

const WORKLOAD_IDENTITY_FEDERATION_STACK_PARAM_TOKENS = {
  ElasticOrganizationId: TEMPLATE_URL_ELASTIC_ORGANIZATION_ID_ENV_VAR,
  ElasticCloudProvider: TEMPLATE_URL_CLOUD_PROVIDER_ENV_VAR,
  ElasticCloudRegion: TEMPLATE_URL_CLOUD_REGION_ENV_VAR,
  ElasticCloudEnvironment: TEMPLATE_URL_CLOUD_ENVIRONMENT_ENV_VAR,
  ElasticResourceType: TEMPLATE_URL_ELASTIC_RESOURCE_TYPE_ENV_VAR,
  ElasticResourceId: TEMPLATE_URL_ELASTIC_RESOURCE_ID_ENV_VAR,
} as const satisfies Record<string, TemplateUrlToken>;

/**
 * Stack parameters of the IaCP `workload_identity_federation` template that Kibana fills.
 * Unresolved values are omitted so the user can still enter them in the console; outside
 * Elastic Cloud none are known, so the defaults are not sent.
 */
export const getWorkloadIdentityFederationStackParams = (
  cloud: CloudSetupForCloudConnector | undefined
): Record<string, string> => {
  if (!cloud?.isCloudEnabled && !cloud?.isServerlessEnabled) {
    return {};
  }
  const values = getTemplateTokenValues(cloud, undefined);

  return Object.entries(WORKLOAD_IDENTITY_FEDERATION_STACK_PARAM_TOKENS).reduce<
    Record<string, string>
  >((params, [name, token]) => {
    const value = values[token];
    return value ? { ...params, [name]: value } : params;
  }, {});
};
