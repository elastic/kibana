/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { API_VERSIONS } from '../../../common';

import { sendRequestForRq } from './use_request';
import {
  sendGetCloudOnboardingDeploymentCounts,
  sendGetCloudOnboardingDeployments,
} from './cloud_onboarding_deployment';

jest.mock('./use_request');

const mockSendRequest = sendRequestForRq as jest.Mock;

describe('cloud onboarding deployment requests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSendRequest.mockResolvedValue({});
  });

  it('requests the counts from the internal route', async () => {
    await sendGetCloudOnboardingDeploymentCounts({ provider: 'aws' });

    expect(mockSendRequest).toHaveBeenCalledWith({
      path: '/internal/fleet/cloud_onboarding_deployments/counts',
      method: 'get',
      version: API_VERSIONS.internal.v1,
      query: { provider: 'aws' },
    });
  });

  it('requests one page of a package from the public list route', async () => {
    await sendGetCloudOnboardingDeployments({
      provider: 'aws',
      packageName: 'aws_bedrock',
      page: 2,
      perPage: 20,
    });

    expect(mockSendRequest).toHaveBeenCalledWith({
      path: '/api/fleet/cloud_onboarding_deployments',
      method: 'get',
      version: API_VERSIONS.public.v1,
      query: { provider: 'aws', packageName: 'aws_bedrock', page: 2, perPage: 20 },
    });
  });
});
