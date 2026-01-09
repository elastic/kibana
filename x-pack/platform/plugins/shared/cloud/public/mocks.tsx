/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, PropsWithChildren } from 'react';
import React from 'react';
import type { CloudBasicUrls, CloudSetup, CloudStart } from './types';

const mockCloudUrls: CloudBasicUrls = {
  baseUrl: 'base-url',
  kibanaUrl: 'kibana-url',
  deploymentUrl: 'deployment-url',
  profileUrl: 'profile-url',
  organizationUrl: 'organization-url',
};

function createSetupMock(): jest.Mocked<CloudSetup> {
  return {
    cloudId: 'mock-cloud-id',
    deploymentId: 'mock-deployment-id',
    isCloudEnabled: true,
    cname: 'cname',
    fetchElasticsearchConfig: jest
      .fn()
      .mockResolvedValue({ elasticsearchUrl: 'elasticsearch-url' }),
    cloudHost: 'cloud-host',
    cloudDefaultPort: '443',
    isElasticStaffOwned: true,
    trialEndDate: new Date('2020-10-01T14:13:12Z'),
    registerCloudService: jest.fn(),
    onboarding: {},
    isServerlessEnabled: false,
    serverless: {
      projectId: undefined,
      projectName: undefined,
      projectType: undefined,
      productTier: undefined,
    },
    getUrls: jest.fn().mockReturnValue({}),
    getPrivilegedUrls: jest.fn().mockResolvedValue({}),
    isInTrial: jest.fn().mockReturnValue(false),
    ...mockCloudUrls,
  };
}

const getContextProvider: () => FC<PropsWithChildren<unknown>> =
  () =>
  ({ children }) =>
    <>{children}</>;

const createStartMock = (): jest.Mocked<CloudStart> => ({
  CloudContextProvider: jest.fn(getContextProvider()),
  cloudId: 'mock-cloud-id',
  isCloudEnabled: true,
  isServerlessEnabled: false,
  serverless: {
    projectId: undefined,
  },
  fetchElasticsearchConfig: jest.fn().mockResolvedValue({ elasticsearchUrl: 'elasticsearch-url' }),
  getUrls: jest.fn().mockReturnValue({}),
  getPrivilegedUrls: jest.fn().mockResolvedValue({}),
  isInTrial: jest.fn().mockReturnValue(false),
  ...mockCloudUrls,
});

export const cloudMock = {
  createSetup: createSetupMock,
  createStart: createStartMock,
};
