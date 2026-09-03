/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toAutoOpsDeploymentUrl } from './autoops_url';

const SERVICE_URL =
  'https://app.auto-ops.cloud.elastic.co/regions/aws-us-east-1/organizations/198583657190/clusters/abcdef1234567890abcdef1234567890/cluster';
const DEPLOYMENT_ID = 'ed211902155ba60ebf36df819054704e';
const EXPECTED =
  'https://app.auto-ops.cloud.elastic.co/regions/aws-us-east-1/organizations/198583657190/deployments/ed211902155ba60ebf36df819054704e/deployment';

describe('toAutoOpsDeploymentUrl', () => {
  it('rewrites a cluster-scoped service_url to a deployment-scoped URL', () => {
    expect(toAutoOpsDeploymentUrl(SERVICE_URL, DEPLOYMENT_ID)).toBe(EXPECTED);
  });

  it('returns service_url unchanged when deploymentId is undefined', () => {
    expect(toAutoOpsDeploymentUrl(SERVICE_URL, undefined)).toBe(SERVICE_URL);
  });

  it('returns service_url unchanged when deploymentId is an empty string', () => {
    expect(toAutoOpsDeploymentUrl(SERVICE_URL, '')).toBe(SERVICE_URL);
  });

  it('returns undefined when serviceUrl is undefined', () => {
    expect(toAutoOpsDeploymentUrl(undefined, DEPLOYMENT_ID)).toBeUndefined();
  });

  it('returns service_url unchanged for a malformed URL', () => {
    expect(toAutoOpsDeploymentUrl('not-a-url', DEPLOYMENT_ID)).toBe('not-a-url');
  });

  it('returns service_url unchanged when the pathname has no organizations segment', () => {
    const noOrg = 'https://app.auto-ops.cloud.elastic.co/regions/aws-us-east-1';
    expect(toAutoOpsDeploymentUrl(noOrg, DEPLOYMENT_ID)).toBe(noOrg);
  });

  it('returns service_url unchanged when organizations segment has no following id', () => {
    const truncated = 'https://app.auto-ops.cloud.elastic.co/regions/aws-us-east-1/organizations';
    expect(toAutoOpsDeploymentUrl(truncated, DEPLOYMENT_ID)).toBe(truncated);
  });

  it('preserves the origin exactly — does not hardcode the host', () => {
    const stagingUrl =
      'https://staging.auto-ops.cloud.elastic.co/regions/aws-us-east-1/organizations/198583657190/clusters/abcdef1234567890abcdef1234567890/cluster';
    const result = toAutoOpsDeploymentUrl(stagingUrl, DEPLOYMENT_ID);
    expect(result?.startsWith('https://staging.auto-ops.cloud.elastic.co')).toBe(true);
  });

  it('preserves the region segment exactly', () => {
    const result = toAutoOpsDeploymentUrl(SERVICE_URL, DEPLOYMENT_ID);
    expect(result).toContain('/regions/aws-us-east-1/');
  });

  it('preserves the organization id segment', () => {
    const result = toAutoOpsDeploymentUrl(SERVICE_URL, DEPLOYMENT_ID);
    expect(result).toContain('/organizations/198583657190/');
  });
});
