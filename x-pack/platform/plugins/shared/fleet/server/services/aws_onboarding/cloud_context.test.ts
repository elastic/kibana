/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CloudSetup } from '@kbn/cloud-plugin/server';

import { getWorkloadIdentityStackParameters } from './cloud_context';

const cloud = (overrides: Record<string, unknown>) => overrides as unknown as CloudSetup;

describe('getWorkloadIdentityStackParameters', () => {
  it('derives the six Elastic* parameters from a serverless cloud contract', () => {
    expect(
      getWorkloadIdentityStackParameters(
        cloud({
          isCloudEnabled: true,
          isServerlessEnabled: true,
          serverless: { projectId: 'project-1' },
          organizationId: 'org-1',
          csp: 'aws',
          region: 'us-east-1',
          baseUrl: 'https://cloud.elastic.co',
        })
      )
    ).toEqual({
      ElasticOrganizationId: 'org-1',
      ElasticCloudProvider: 'aws',
      ElasticCloudRegion: 'us-east-1',
      ElasticCloudEnvironment: 'production',
      ElasticResourceType: 'project',
      ElasticResourceId: 'project-1',
    });
  });

  it('returns an empty parameter set when cloud is disabled', () => {
    expect(
      getWorkloadIdentityStackParameters(
        cloud({ isCloudEnabled: false, isServerlessEnabled: false, region: 'us-east-1' })
      )
    ).toEqual({});
    expect(getWorkloadIdentityStackParameters(undefined)).toEqual({});
  });
});
