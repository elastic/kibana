/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CloudProvider } from './cloud_connector';

export type { CloudProvider };

/** ECF template family, matching `EcfTemplateFamily` in the ingest_hub plugin. */
export type CloudOnboardingEcfFamily = 'unified' | 'otel' | 'crowdstrike';

/** One deployed ECF CloudFormation stack, stored as part of the cloud onboarding deployment. */
export interface CloudOnboardingEcfStack {
  /** ECF template family: unified (ECS), otel, or crowdstrike. */
  family: CloudOnboardingEcfFamily;
  /** CloudFormation stack name. Defaults to the Kibana-chosen name if the user did not edit it. */
  stackName: string;
  /** ECF template semantic version resolved at launch time, e.g. "1.10.0". */
  templateVersion: string;
}

export type DeploymentMethod = 'managed_integration' | 'ecf' | 'agent_based';

export type CloudOnboardingDeploymentAuthMethod =
  | 'identity_federation'
  | 'static_keys'
  | 'temporary_keys'
  | 'shared_credentials'
  | 'assume_role';

export type CloudOnboardingDeploymentStatus = 'pending' | 'deploying' | 'succeeded' | 'failed';

export type CloudOnboardingDeploymentServiceVars = Record<string, unknown>;

export interface CloudOnboardingDeployment {
  id: string;
  provider: CloudProvider;
  connectorId?: string;
  mechanisms: DeploymentMethod[];
  deploymentId?: string;
  deploymentName?: string;
  services: string[];
  status: CloudOnboardingDeploymentStatus;
  statusMessage?: string;
  attemptCount: number;
  serviceVars?: Record<string, CloudOnboardingDeploymentServiceVars>;
  /** Global AWS region from the Service Settings step. Used to re-run deploy on retry and to hydrate the onboarding flow on resume. */
  globalRegion?: string;
  /** Data format selected in the Services step. Used to hydrate the services step on resume so service filtering is consistent. */
  dataFormat?: 'ecs' | 'otel';
  packagePolicyIds?: string[];
  /** Agent policy IDs for agent_based mechanism — one per targeted agent policy. For new-policy deploys this is a single-element array; for existing-policy deploys it contains every policy the package policies were attached to. */
  agentPolicyIds?: string[];
  /** Elasticsearch API key ID for push mechanisms (ecf). Set by the backend after key creation; used to identify the key for rotation/revocation. */
  apiKeyId?: string;
  /** ECF CloudFormation stacks launched as part of this deployment. Written by the wizard after the user clicks Launch. */
  ecfStacks?: CloudOnboardingEcfStack[];
  /**
   * Authentication method used for this deployment.
   * - managed_integration: identity_federation | static_keys
   * - agent_based: static_keys (direct_access_keys) | temporary_keys | shared_credentials | assume_role
   */
  authMethod?: CloudOnboardingDeploymentAuthMethod;
}

export type NewCloudOnboardingDeployment = Omit<CloudOnboardingDeployment, 'id'>;

export type CreateCloudOnboardingDeploymentInput = Omit<
  CloudOnboardingDeployment,
  | 'id'
  | 'status'
  | 'attemptCount'
  | 'deploymentId'
  | 'deploymentName'
  | 'packagePolicyIds'
  | 'agentPolicyIds'
  | 'apiKeyId'
>;

export type UpdateCloudOnboardingDeploymentInput = Partial<
  Omit<CloudOnboardingDeployment, 'id' | 'provider' | 'connectorId' | 'globalRegion'>
>;
