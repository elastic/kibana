/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AccountType } from '../models/cloud_connector';
import type {
  AwsStackCallbackStatus,
  CloudOnboardingDeployment,
  CloudOnboardingDeploymentAuthMethod,
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
    dataFormat?: 'ecs' | 'otel';
    authMethod?: CloudOnboardingDeploymentAuthMethod;
    agentPolicyIds?: string[];
  };
}

export interface CreateCloudOnboardingDeploymentResponse {
  item: CloudOnboardingDeployment;
}

export interface GetCloudOnboardingDeploymentResponse {
  item: CloudOnboardingDeployment;
}

export interface UpdateCloudOnboardingDeploymentRequest {
  params: { id: string };
  body: {
    status?: CloudOnboardingDeploymentStatus;
    statusMessage?: string;
    deploymentId?: string;
    deploymentName?: string;
    services?: string[];
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

export interface UpdateCloudOnboardingDeploymentResponse {
  item: CloudOnboardingDeployment;
}

export interface StartAwsStackCallbackRequest {
  params: { id: string };
  body: {
    connectorName?: string;
    accountType?: AccountType;
    iac_key?: string | null;
    iac_blueprint_id?: string | null;
    iac_blueprint_version?: string | null;
  };
}

export interface StartAwsStackCallbackResponse {
  /** Quick-create stack parameters that make the stack report back. */
  stackParams: { ElasticOnboardingId: string; ElasticCallback: string };
  expiresAt: string;
}

export interface GetAwsStackCallbackResponse {
  status: AwsStackCallbackStatus;
  expiresAt: string;
  connectorId?: string;
  connectorName?: string;
  error?: string;
}
