/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CloudSetup } from '@kbn/cloud-plugin/public';

export interface FederatedIdentityClusterInfo {
  /** OIDC discovery URL for the workload-identity issuer; absent unless injected via config. */
  jwtIssuer?: string;
  /** Elastic Cloud Organization ID that owns this deployment/project, when known. */
  cloudOrgId?: string;
  /**
   * deployment:<id> for ESS/ECH, project:<id> for serverless, absent outside Elastic Cloud.
   * Used to scope IAM role trust.
   */
  deploymentId?: string;
  /** True when running on serverless Elastic Cloud. Controls the label shown to the user. */
  isServerless: boolean;
}

/**
 * Builds the cluster-level values the federated identity auth section of the data source
 * creation flyout needs to prefill the CSP side of the OIDC trust (IAM role trust policy /
 * workload identity binding).
 *
 * The JWT issuer comes from `xpack.dataFederation.workloadIdentityIssuerUrl` injected into
 * kibana.yml by the controller; it is absent when not configured.
 */
export const buildFederatedIdentityClusterInfo = (
  cloud?: CloudSetup,
  injectedIssuerUrl?: string
): FederatedIdentityClusterInfo => {
  const deploymentId =
    cloud?.isServerlessEnabled && cloud.serverless?.projectId
      ? `project:${cloud.serverless.projectId}`
      : cloud?.deploymentId
      ? `deployment:${cloud.deploymentId}`
      : undefined;

  return {
    jwtIssuer: injectedIssuerUrl,
    cloudOrgId: cloud?.organizationId,
    deploymentId,
    isServerless: Boolean(cloud?.isServerlessEnabled),
  };
};
