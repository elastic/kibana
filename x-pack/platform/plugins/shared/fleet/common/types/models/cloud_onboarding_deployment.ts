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
  | 'cloud_forwarder';

export type CloudOnboardingDeploymentStatus = 'pending' | 'deploying' | 'succeeded' | 'failed';

export type CloudOnboardingDeploymentServiceVars = Array<Record<string, unknown>>;

export interface CloudOnboardingDeployment {
  id: string;
  provider: CloudProvider;
  connectionId: string;
  mechanisms: CloudOnboardingDeploymentMechanism[];
  deploymentId?: string;
  deploymentName?: string;
  services: string[];
  status: CloudOnboardingDeploymentStatus;
  statusMessage?: string;
  attemptCount?: number;
  vars?: Record<string, string>;
  serviceVars?: Record<string, CloudOnboardingDeploymentServiceVars>;
  secrets?: Record<string, string>;
  packagePolicyIds?: string[];
  createdAt: string;
  updatedAt: string;
}

export type NewCloudOnboardingDeployment = Omit<CloudOnboardingDeployment, 'id'>;

export type CreateCloudOnboardingDeploymentInput = Omit<
  CloudOnboardingDeployment,
  'id' | 'status' | 'attemptCount' | 'createdAt' | 'updatedAt'
>;

// Secrets are intentionally excluded: partial updates could silently clobber
// existing keys. Use a dedicated secrets-update path when needed.
export type UpdateCloudOnboardingDeploymentInput = Partial<
  Omit<
    CloudOnboardingDeployment,
    'id' | 'provider' | 'connectionId' | 'secrets' | 'createdAt' | 'updatedAt'
  >
>;
