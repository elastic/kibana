/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CloudSetup } from '@kbn/cloud-plugin/public';

export interface FederatedIdentityClusterInfo {
  /** OIDC discovery URL for the workload-identity issuer. */
  jwtIssuer: string;
  /** Elastic Cloud Organization ID that owns this deployment/project. */
  cloudOrgId: string;
  /** deployment:<id> for ESS/ECH, project:<id> for serverless. Used to scope IAM role trust. */
  deploymentId: string;
  /** True when running on serverless Elastic Cloud. Controls the label shown to the user. */
  isServerless: boolean;
}

/**
 * Derives the three read-only values shown in the federated identity auth section of the
 * data source creation flyout. These are presented to the user so they can configure the
 * CSP side of the OIDC trust (IAM role trust policy / workload identity binding).
 *
 * Values are sourced from CloudSetup (available at plugin setup time). Falls back to empty
 * strings when running outside Elastic Cloud so the fields render blank without crashing.
 */
export const buildFederatedIdentityClusterInfo = (
  cloud?: CloudSetup
): FederatedIdentityClusterInfo => {
  const cloudOrgId = cloud?.organizationId ?? '';

  const deploymentId =
    cloud?.isServerlessEnabled && cloud.serverless?.projectId
      ? `project:${cloud.serverless.projectId}`
      : cloud?.deploymentId
      ? `deployment:${cloud.deploymentId}`
      : '';

  // Per-org issuer: https://workload-identity-issuer.{region}.{csp}.svc.elastic.cloud/orgs/{orgID}
  // The /orgs/{orgID} suffix adds a structural cross-customer security boundary at the `iss`
  // level (workload-identity-issuer PR #98).
  const jwtIssuer =
    cloud?.region && cloud?.csp && cloudOrgId
      ? `https://workload-identity-issuer.${cloud.region}.${cloud.csp}.svc.elastic.cloud/orgs/${cloudOrgId}`
      : '';

  const isServerless = Boolean(cloud?.isServerlessEnabled);

  return { jwtIssuer, cloudOrgId, deploymentId, isServerless };
};
