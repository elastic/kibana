/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Rewrites an AutoOps cluster-scoped `service_url` to a deployment-scoped URL when a
 * `deploymentId` is available (ECE only), so the link lands on the correct page:
 *
 *   in:  .../organizations/{orgId}/clusters/{clusterId}/cluster
 *   out: .../organizations/{orgId}/deployments/{deploymentId}/deployment
 *
 * Falls back to returning `serviceUrl` unchanged when `deploymentId` is absent (self-managed
 * clusters don't have one), when the URL doesn't have the expected shape, or when parsing fails.
 * Returns `undefined` when `serviceUrl` is absent.
 */
export function toAutoOpsDeploymentUrl(
  serviceUrl?: string,
  deploymentId?: string
): string | undefined {
  if (!serviceUrl) {
    return undefined;
  }
  if (!deploymentId) {
    return serviceUrl;
  }

  let parsed: URL;
  try {
    parsed = new URL(serviceUrl);
  } catch {
    return serviceUrl;
  }

  const parts = parsed.pathname.split('/');
  const orgIdx = parts.findIndex((part) => part === 'organizations');

  // Need 'organizations' followed by a non-empty org id segment.
  if (orgIdx === -1 || orgIdx + 1 >= parts.length || !parts[orgIdx + 1]) {
    return serviceUrl;
  }

  // Rebuild the pathname up to and including the org id, then append the deployment tail.
  parsed.pathname = `${parts
    .slice(0, orgIdx + 2)
    .join('/')}/deployments/${deploymentId}/deployment`;
  return parsed.toString();
}
