/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CloudOnboardingDeployment,
  CloudOnboardingDeploymentAuthMethod,
  CloudOnboardingDeploymentListItem,
  CloudProvider,
  DeploymentMethod,
  CloudOnboardingDeploymentStatus,
  CloudOnboardingEcfStack,
} from '../models/cloud_onboarding_deployment';

export interface CreateCloudOnboardingDeploymentRequest {
  body: {
    provider: CloudProvider;
    connectorId?: string;
    mechanisms: DeploymentMethod[];
    services: string[];
    serviceVars?: Record<string, Record<string, unknown>>;
    globalRegion?: string;
    /** Global data stream namespace from the Service settings step. */
    namespace?: string;
    dataFormat?: 'ecs' | 'otel';
    authMethod?: CloudOnboardingDeploymentAuthMethod;
    agentPolicyIds?: string[];
    packageNames?: string[];
    serviceNames?: Record<string, string>;
  };
}

export interface CreateCloudOnboardingDeploymentResponse {
  item: CloudOnboardingDeployment;
}

export interface GetCloudOnboardingDeploymentResponse {
  item: CloudOnboardingDeployment;
}

export interface GetCloudOnboardingDeploymentsRequest {
  query?: {
    packageName?: string;
    provider?: CloudProvider;
    page?: number;
    perPage?: number;
  };
}

export interface GetCloudOnboardingDeploymentsResponse {
  items: CloudOnboardingDeploymentListItem[];
  total: number;
  page: number;
  perPage: number;
}

export interface UpdateCloudOnboardingDeploymentRequest {
  params: { id: string };
  body: {
    status?: CloudOnboardingDeploymentStatus;
    statusMessage?: string;
    deploymentId?: string;
    deploymentName?: string;
    /** Integration name used by the last deploy, before any per-package suffix. */
    integrationName?: string;
    /** Set to null to clear the description. */
    description?: string | null;
    /** Set to null to clear the namespace. */
    namespace?: string | null;
    services?: string[];
    packageNames?: string[];
    serviceNames?: Record<string, string>;
    serviceVars?: Record<string, Record<string, unknown>>;
    attemptCount?: number;
    authMethod?: CloudOnboardingDeploymentAuthMethod | null;
    agentPolicyIds?: string[];
    packagePolicyIds?: string[];
    policyIdsByInstance?: Record<string, string>;
    apiKeyId?: string;
    mechanisms?: DeploymentMethod[];
    ecfStacks?: CloudOnboardingEcfStack[];
    /** Set to null to clear the connector association (e.g. on MI→ECF transition). */
    connectorId?: string | null;
  };
}

export interface DeleteCloudOnboardingDeploymentResponse {
  id: string;
}

export interface UpdateCloudOnboardingDeploymentResponse {
  item: CloudOnboardingDeployment;
}
