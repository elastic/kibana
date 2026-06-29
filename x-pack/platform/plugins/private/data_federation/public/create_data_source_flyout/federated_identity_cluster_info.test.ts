/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CloudSetup } from '@kbn/cloud-plugin/public';
import { buildFederatedIdentityClusterInfo } from './federated_identity_cluster_info';

describe('buildFederatedIdentityClusterInfo', () => {
  it('returns empty strings when cloud is undefined', () => {
    expect(buildFederatedIdentityClusterInfo(undefined)).toEqual({
      jwtIssuer: '',
      cloudOrgId: '',
      deploymentId: '',
      isServerless: false,
    });
  });

  it('builds correct values for an ESS deployment', () => {
    const cloud = {
      organizationId: 'org-abc123',
      deploymentId: 'dep-xyz456',
      region: 'us-east-1',
      csp: 'aws',
      isServerlessEnabled: false,
      serverless: {},
    } as unknown as CloudSetup;

    expect(buildFederatedIdentityClusterInfo(cloud)).toEqual({
      jwtIssuer: 'https://workload-identity-issuer.us-east-1.aws.svc.elastic.cloud/orgs/org-abc123',
      cloudOrgId: 'org-abc123',
      deploymentId: 'deployment:dep-xyz456',
      isServerless: false,
    });
  });

  it('builds correct values for a serverless project', () => {
    const cloud = {
      organizationId: 'org-abc123',
      deploymentId: undefined,
      region: 'europe-west1',
      csp: 'gcp',
      isServerlessEnabled: true,
      serverless: { projectId: 'proj-789' },
    } as unknown as CloudSetup;

    expect(buildFederatedIdentityClusterInfo(cloud)).toEqual({
      jwtIssuer: 'https://workload-identity-issuer.europe-west1.gcp.svc.elastic.cloud/orgs/org-abc123',
      cloudOrgId: 'org-abc123',
      deploymentId: 'project:proj-789',
      isServerless: true,
    });
  });

  it('returns empty issuer when orgId is missing', () => {
    const cloud = {
      organizationId: undefined,
      deploymentId: 'dep-xyz456',
      region: 'us-east-1',
      csp: 'aws',
      isServerlessEnabled: false,
      serverless: {},
    } as unknown as CloudSetup;

    expect(buildFederatedIdentityClusterInfo(cloud).jwtIssuer).toBe('');
  });

  it('returns empty issuer when region is missing', () => {
    const cloud = {
      organizationId: 'org-abc123',
      deploymentId: 'dep-xyz456',
      region: undefined,
      csp: 'aws',
      isServerlessEnabled: false,
      serverless: {},
    } as unknown as CloudSetup;

    expect(buildFederatedIdentityClusterInfo(cloud).jwtIssuer).toBe('');
  });

  it('returns empty issuer when csp is missing', () => {
    const cloud = {
      organizationId: 'org-abc123',
      deploymentId: 'dep-xyz456',
      region: 'us-east-1',
      csp: undefined,
      isServerlessEnabled: false,
      serverless: {},
    } as unknown as CloudSetup;

    expect(buildFederatedIdentityClusterInfo(cloud).jwtIssuer).toBe('');
  });

  it('returns empty deploymentId when both deploymentId and serverless.projectId are missing', () => {
    const cloud = {
      organizationId: 'org-abc123',
      deploymentId: undefined,
      region: 'us-east-1',
      csp: 'aws',
      isServerlessEnabled: false,
      serverless: {},
    } as unknown as CloudSetup;

    expect(buildFederatedIdentityClusterInfo(cloud).deploymentId).toBe('');
  });
});
