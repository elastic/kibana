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
  /** CloudFormation stack ARN (StackId) pasted by the user after launch. Used to build the AWS Console update link when services change. */
  stackArn?: string;
  /** Service IDs active when the stack was last launched or updated. Used to detect staleness on session resume. */
  serviceIds?: string[];
  /** Stack-relevant settings (bucket and log group ARNs) per service when the stack was last launched or updated. Used to detect settings drift on session resume. */
  serviceConfigs?: CloudOnboardingEcfServiceConfig[];
}

/** The per-service values that feed an ECF stack's parameters. */
export interface CloudOnboardingEcfServiceConfig {
  serviceId: string;
  bucketArns: string[];
  logGroupArns: string[];
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

/**
 * One row of the Service settings step as of the last deploy: an original service
 * (`instanceId === serviceId`) or a duplicate of one (`<serviceId>__dup-<n>`).
 */
export interface CloudOnboardingInstance {
  instanceId: string;
  /** The service this instance belongs to. Policy-template key; unchanged for duplicates. */
  serviceId: string;
  /** Display name. */
  name: string;
  isDuplicate: boolean;
}

export interface CloudOnboardingDeployment {
  id: string;
  provider: CloudProvider;
  /** Null after MI→ECF transition explicitly clears the connector association. */
  connectorId?: string | null;
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
  /** Integration name as entered in the Service settings step, before any per-package suffix is applied. Used to identify the onboarding session. */
  integrationName?: string;
  /** Integration description as entered in the Service settings step. Set on every package policy created by the deploy. */
  description?: string;
  /** Global data stream namespace from the Service settings step. Absent or empty means each policy inherits its agent policy's namespace. */
  namespace?: string;
  /** The service instances (originals and duplicates) of the last deploy. Hydrated into the Service settings step on resume so duplicates and their names come back. Absent on onboardings saved before this field existed. */
  instances?: CloudOnboardingInstance[];
  /** Data format selected in the Services step. Used to hydrate the services step on resume so service filtering is consistent. */
  dataFormat?: 'ecs' | 'otel';
  packagePolicyIds?: string[];
  /** instanceId → policyId mapping persisted after deploy. Used to reconstruct cleanup targets when a deployed onboarding URL is reopened. Covers the managed_integration and agent_based mechanisms; ECF has no package policies. */
  policyIdsByInstance?: Record<string, string>;
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
  authMethod?: CloudOnboardingDeploymentAuthMethod | null;
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
  | 'apiKeyId'
>;

export type UpdateCloudOnboardingDeploymentInput = Partial<
  Omit<
    CloudOnboardingDeployment,
    'id' | 'provider' | 'connectorId' | 'globalRegion' | 'authMethod' | 'description' | 'namespace'
  >
> & {
  /** Set to null to clear the description. */
  description?: string | null;
  /** Set to null to clear the namespace. */
  namespace?: string | null;
  /** Set to null to clear the connector association (e.g. on MI→ECF transition). */
  connectorId?: string | null;
  /** Set to null to clear the auth method (e.g. on MI→ECF transition). */
  authMethod?: CloudOnboardingDeploymentAuthMethod | null;
};
