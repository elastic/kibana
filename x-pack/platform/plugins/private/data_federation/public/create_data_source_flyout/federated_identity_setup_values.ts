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

/**
 * Prototype stand-ins used when cloud metadata is unavailable, so the setup commands always
 * render values the user can copy. Elastic knows both values at launch, so nothing here is
 * ever meant to be edited by the user.
 */
const MOCK_JWT_ISSUER =
  'https://workload-identity-issuer.us-east-1.aws.svc.elastic.cloud/orgs/org-abc123';
const MOCK_SUBJECT = 'deployment:dep-xyz456';

export const resolveFederatedIdentitySetupValues = (
  cloudInfo?: FederatedIdentityClusterInfo
): FederatedIdentitySetupValues => {
  const jwtIssuer = cloudInfo?.jwtIssuer?.trim() || MOCK_JWT_ISSUER;
  const subject = cloudInfo?.deploymentId?.trim() || MOCK_SUBJECT;

  return { jwtIssuer, subject };
};
