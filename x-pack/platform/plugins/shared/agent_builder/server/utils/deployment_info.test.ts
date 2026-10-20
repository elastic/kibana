/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDeploymentInfo } from './deployment_info';

const traditional = { version: '9.3.0', buildFlavor: 'traditional' as const };
const serverlessBuild = { version: '9.3.0', buildFlavor: 'serverless' as const };

const statefulCloud = {
  isCloudEnabled: true,
  isServerlessEnabled: false,
  serverless: {},
};

describe('getDeploymentInfo', () => {
  it('returns self_managed with the version when cloud is disabled', () => {
    expect(
      getDeploymentInfo({
        cloud: { isCloudEnabled: false, isServerlessEnabled: false, serverless: {} },
        packageInfo: traditional,
        airgapped: false,
      })
    ).toEqual({ environment: 'self_managed', version: '9.3.0', airgapped: false });
  });

  it('returns self_managed when the cloud plugin is not available', () => {
    expect(getDeploymentInfo({ packageInfo: traditional, airgapped: true })).toEqual({
      environment: 'self_managed',
      version: '9.3.0',
      airgapped: true,
    });
  });

  it('returns ech for cloud deployments that are not ECE', () => {
    expect(
      getDeploymentInfo({
        cloud: { ...statefulCloud, isEce: false },
        packageInfo: traditional,
        airgapped: false,
      })
    ).toEqual({ environment: 'ech', version: '9.3.0', airgapped: false });
  });

  it('returns ece for ECE deployments', () => {
    expect(
      getDeploymentInfo({
        cloud: { ...statefulCloud, isEce: true },
        packageInfo: traditional,
        airgapped: false,
      })
    ).toEqual({ environment: 'ece', version: '9.3.0', airgapped: false });
  });

  it('returns serverless project details without the version on serverless', () => {
    expect(
      getDeploymentInfo({
        cloud: {
          isCloudEnabled: true,
          isServerlessEnabled: true,
          serverless: {
            projectId: 'project-id',
            projectType: 'observability',
            productTier: 'complete',
            projectName: 'my-project',
          },
        },
        packageInfo: serverlessBuild,
        airgapped: false,
      })
    ).toEqual({
      environment: 'serverless',
      airgapped: false,
      serverless: {
        projectType: 'observability',
        productTier: 'complete',
      },
    });
  });

  it('falls back to the build flavor without project details when the cloud plugin is not available', () => {
    expect(getDeploymentInfo({ packageInfo: serverlessBuild, airgapped: false })).toEqual({
      environment: 'serverless',
      airgapped: false,
    });
  });
});
