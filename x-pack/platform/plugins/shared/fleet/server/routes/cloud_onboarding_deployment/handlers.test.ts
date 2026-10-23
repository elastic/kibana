/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core/server/mocks';

import type { CloudOnboardingDeployment } from '../../../common/types';
import { cloudOnboardingDeploymentService } from '../../services/cloud_onboarding_deployment';

import { createCloudOnboardingDeploymentHandler } from './handlers';

jest.mock('../../services/cloud_onboarding_deployment');

const mockedService = jest.mocked(cloudOnboardingDeploymentService);

const PENDING_POLICY = {
  id: 'pp-1',
  instanceIds: ['cloudtrail'],
  request: {
    name: 'aws-cloudtrail',
    namespace: 'default',
    package: { name: 'aws', version: '3.0.0' },
    inputs: {},
  },
};

const DEPLOYMENT: CloudOnboardingDeployment = {
  id: 'dep-1',
  provider: 'aws',
  mechanisms: ['managed_integration'],
  services: ['cloudtrail'],
  status: 'pending',
  attemptCount: 1,
  pendingAgentlessPolicies: [PENDING_POLICY],
};

const buildContext = (authz: { writeIntegrationPolicies: boolean }) =>
  ({
    fleet: Promise.resolve({
      internalSoClient: { tag: 'internal-so-client' },
      authz: {
        // Fleet All is deliberately false: the create-agentless-policy route does not need it.
        fleet: { all: false },
        integrations: { all: true, writeIntegrationPolicies: authz.writeIntegrationPolicies },
      },
    }),
  } as any);

describe('createCloudOnboardingDeploymentHandler', () => {
  let response: ReturnType<typeof httpServerMock.createResponseFactory>;

  beforeEach(() => {
    jest.clearAllMocks();
    response = httpServerMock.createResponseFactory();
    mockedService.create.mockResolvedValue(DEPLOYMENT);
  });

  it('stores pending agentless policies and keeps them out of the response', async () => {
    const request = httpServerMock.createKibanaRequest({
      body: {
        provider: 'aws',
        mechanisms: ['managed_integration'],
        services: ['cloudtrail'],
        pendingAgentlessPolicies: [PENDING_POLICY],
      },
    });

    await createCloudOnboardingDeploymentHandler(
      buildContext({ writeIntegrationPolicies: true }),
      request,
      response
    );

    expect(mockedService.create).toHaveBeenCalledWith(
      { tag: 'internal-so-client' },
      expect.objectContaining({ pendingAgentlessPolicies: [PENDING_POLICY] })
    );
    const [{ body }] = response.ok.mock.calls[0] as [{ body: { item: Record<string, unknown> } }];
    expect(body.item).not.toHaveProperty('pendingAgentlessPolicies');
    expect(body.item).toMatchObject({ id: 'dep-1', status: 'pending' });
  });

  it('refuses pending agentless policies without the privilege to write integration policies', async () => {
    const request = httpServerMock.createKibanaRequest({
      body: {
        provider: 'aws',
        mechanisms: ['managed_integration'],
        services: ['cloudtrail'],
        pendingAgentlessPolicies: [PENDING_POLICY],
      },
    });

    await createCloudOnboardingDeploymentHandler(
      buildContext({ writeIntegrationPolicies: false }),
      request,
      response
    );

    expect(response.forbidden).toHaveBeenCalled();
    expect(mockedService.create).not.toHaveBeenCalled();
  });

  it('needs no extra privilege for a deployment without pending policies', async () => {
    const request = httpServerMock.createKibanaRequest({
      body: { provider: 'aws', mechanisms: ['managed_integration'], services: ['cloudtrail'] },
    });

    await createCloudOnboardingDeploymentHandler(
      buildContext({ writeIntegrationPolicies: false }),
      request,
      response
    );

    expect(response.ok).toHaveBeenCalled();
  });
});
