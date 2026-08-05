/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FederatedIdentityClusterInfo } from './federated_identity_cluster_info';

export type FederatedIdentitySetupMethod = 'manual' | 'one_click';

export interface FederatedIdentitySetupValues {
  jwtIssuer: string;
  subject: string;
}

export const resolveFederatedIdentitySetupValues = (
  cloudInfo?: FederatedIdentityClusterInfo
): FederatedIdentitySetupValues => {
  const jwtIssuer = cloudInfo?.jwtIssuer?.trim() || 'https://<your-jwt-issuer>';
  const subject =
    cloudInfo?.deploymentId?.trim() ||
    (cloudInfo?.isServerless ? 'project:<your-project-id>' : 'deployment:<your-deployment-id>');

  return { jwtIssuer, subject };
};
