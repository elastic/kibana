/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CloudSetup } from '@kbn/cloud-plugin/public';

const cloudBasicUrls = ({ isCloudEnabled }: { isCloudEnabled: boolean }) => ({
  deploymentUrl: isCloudEnabled ? 'https://deployment.url' : undefined,
  organizationUrl: 'https://organization.url',
  profileUrl: 'https://profile.url',
  snapshotsUrl: 'https://snapshots.url',
});

export const getCloud = ({ isCloudEnabled }: { isCloudEnabled: boolean }) => {
  const cloud: CloudSetup = {
    isCloudEnabled,
    baseUrl: 'https://base.url',
    cloudId: isCloudEnabled ? 'cloud-id' : undefined,
    cname: 'found.io',
    registerCloudService: () => {},
    onboarding: {},
    isServerlessEnabled: false,
    serverless: {
      projectId: undefined,
      projectName: undefined,
    },
    fetchElasticsearchConfig: () =>
      Promise.resolve({ elasticsearchUrl: 'https://elastisearch-url' }),
    ...cloudBasicUrls({ isCloudEnabled }),
    getUrls: () => cloudBasicUrls({ isCloudEnabled }),
    getPrivilegedUrls: () => Promise.resolve({}),
    isInTrial: () => false,
  };

  return cloud;
};
