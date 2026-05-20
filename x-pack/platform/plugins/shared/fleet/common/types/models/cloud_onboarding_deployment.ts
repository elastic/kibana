/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CloudProvider } from './cloud_connector';

export type { CloudProvider };

export type CloudOnboardingDeploymentMechanism =
  | 'identity_federation'
  | 'firehose'
  | 'cloud_forwarder'
  | 'agent_based';

export type CloudOnboardingDeploymentStatus = 'pending' | 'deploying' | 'succeeded' | 'failed';

export type CloudOnboardingDeploymentServiceVars = Array<Record<string, unknown>>;

export interface CloudOnboardingDeployment {
  id: string;
  provider: CloudProvider;
  connectorId: string;
  mechanisms: CloudOnboardingDeploymentMechanism[];
  deploymentId?: string;
  deploymentName?: string;
  services: string[];
  status: CloudOnboardingDeploymentStatus;
  statusMessage?: string;
  attemptCount: number;
  vars?: Record<string, string>;
  serviceVars?: Record<string, CloudOnboardingDeploymentServiceVars>;
  secrets?: Record<string, string>;
  packagePolicyIds?: string[];
  /** Agent policy ID for agent_based mechanism. Separate from packagePolicyIds (in agentless those are equal; for agent_based the agent policy is user-managed). */
  agentPolicyId?: string;
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
  | 'agentPolicyId'
>;

// Secrets are intentionally excluded: partial updates could silently clobber
// existing keys. Use a dedicated secrets-update path when needed.
export type UpdateCloudOnboardingDeploymentInput = Partial<
  Omit<CloudOnboardingDeployment, 'id' | 'provider' | 'connectorId' | 'secrets'>
>;
