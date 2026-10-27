/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import { useLocation } from 'react-router-dom';

import { useOnboardingFlow } from '../../onboarding_flow_context';
import { useOnboardingSO } from './use_onboarding_so';
import { buildAgentlessPolicyRequest } from './deploy_groups';
import type { DeployGroup } from './deploy_groups';
import { useLaunchDeployIntent } from './use_launch_deploy_intent';

jest.mock('react-router-dom', () => ({ useLocation: jest.fn() }));
jest.mock('../../onboarding_flow_context', () => ({ useOnboardingFlow: jest.fn() }));
jest.mock('./use_onboarding_so', () => ({ useOnboardingSO: jest.fn() }));
jest.mock('./deploy_groups', () => ({ buildAgentlessPolicyRequest: jest.fn() }));
jest.mock('uuid', () => {
  let n = 0;
  return { v4: () => `pp-${++n}` };
});

const mockedUseLocation = jest.mocked(useLocation);
const mockedUseOnboardingFlow = jest.mocked(useOnboardingFlow);
const mockedUseOnboardingSO = jest.mocked(useOnboardingSO);
const mockedBuildRequest = jest.mocked(buildAgentlessPolicyRequest);

const group = (groupId: string, instanceIds: string[]): DeployGroup =>
  ({
    groupId,
    instanceIds,
    members: [],
    isDuplicateGroup: false,
    namespace: 'default',
  } as DeployGroup);

const deployGroups = [group('aws', ['a', 'b']), group('aws_bedrock', ['c'])];
const serviceSettings = { globalRegion: 'us-east-1', serviceVars: {}, instances: [] };

describe('useLaunchDeployIntent', () => {
  const createDeployment = jest.fn();
  const persistDeploymentId = jest.fn();
  const updateDetectAndReviewStep = jest.fn();

  const flow = (detectAndReview: Record<string, unknown> = {}) => {
    mockedUseOnboardingFlow.mockReturnValue({
      detectAndReviewStep: {
        isDeploying: false,
        serviceStatuses: {},
        policyIdsByInstance: {},
        failedInstances: [],
        deployErrors: {},
        ...detectAndReview,
      },
      updateDetectAndReviewStep,
      servicesStep: { selectedServiceIds: ['a', 'b', 'c'], dataFormat: 'ecs' },
      authenticateAndDeployStep: {},
      awsServicesMap: new Map(),
    } as unknown as ReturnType<typeof useOnboardingFlow>);
  };

  const render = (overrides: Partial<Parameters<typeof useLaunchDeployIntent>[0]> = {}) =>
    renderHook(() =>
      useLaunchDeployIntent({ deployGroups, serviceSettings, hasEcfServices: false, ...overrides })
    );

  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseLocation.mockReturnValue({ search: '' } as ReturnType<typeof useLocation>);
    mockedUseOnboardingSO.mockReturnValue({
      createDeployment,
      updateDeployment: jest.fn(),
      persistDeploymentId,
    });
    createDeployment.mockResolvedValue('dep-1');
    mockedBuildRequest.mockImplementation(async (g) => ({
      name: `policy-${g.groupId}`,
      namespace: 'default',
      package: { name: g.groupId, version: '1.0.0' },
      inputs: {},
    }));
    flow();
  });

  describe('canAutoDeploy', () => {
    it('is true for a first, create-only run', () => {
      expect(render().result.current.canAutoDeploy).toBe(true);
    });

    it('is false when the URL carries a deployment id (edit mode)', () => {
      mockedUseLocation.mockReturnValue({ search: '?deploymentId=dep-0' } as ReturnType<
        typeof useLocation
      >);
      expect(render().result.current.canAutoDeploy).toBe(false);
    });

    it('is false when a deployment object already exists in the flow', () => {
      flow({ onboardingDeploymentId: 'dep-0' });
      expect(render().result.current.canAutoDeploy).toBe(false);
    });

    it('is false when a selected instance already has a policy', () => {
      flow({ policyIdsByInstance: { b: 'pp-old' } });
      expect(render().result.current.canAutoDeploy).toBe(false);
    });

    it('is false when a cleanup is pending', () => {
      flow({ pendingCleanupPolicyIds: { x: 'pp-stale' } });
      expect(render().result.current.canAutoDeploy).toBe(false);
    });

    it('is false with nothing to deploy', () => {
      expect(render({ deployGroups: [] }).result.current.canAutoDeploy).toBe(false);
    });
  });

  describe('prepareLaunch', () => {
    it('stores one request per group on a pending deployment and records its id in the flow, not the URL', async () => {
      const { result } = render();

      let prepared: { onboardingDeploymentId: string } | undefined;
      await act(async () => {
        prepared = await result.current.prepareLaunch();
      });

      expect(prepared).toEqual({ onboardingDeploymentId: 'dep-1' });
      expect(mockedBuildRequest).toHaveBeenCalledTimes(2);
      expect(mockedBuildRequest).toHaveBeenCalledWith(
        deployGroups[0],
        expect.objectContaining({ namespace: 'default', globalRegion: 'us-east-1' })
      );
      expect(createDeployment).toHaveBeenCalledWith({
        provider: 'aws',
        mechanisms: ['managed_integration'],
        services: ['a', 'b', 'c'],
        serviceVars: {},
        globalRegion: 'us-east-1',
        dataFormat: 'ecs',
        authMethod: 'identity_federation',
        pendingAgentlessPolicies: [
          {
            id: 'pp-1',
            instanceIds: ['a', 'b'],
            request: expect.objectContaining({ name: 'policy-aws' }),
          },
          {
            id: 'pp-2',
            instanceIds: ['c'],
            request: expect.objectContaining({ name: 'policy-aws_bedrock' }),
          },
        ],
      });
      expect(updateDetectAndReviewStep).toHaveBeenCalledWith({ onboardingDeploymentId: 'dep-1' });
      expect(persistDeploymentId).not.toHaveBeenCalled();
    });

    it('writes both mechanisms when ECF services are selected too', async () => {
      const { result } = render({ hasEcfServices: true });
      await act(async () => {
        await result.current.prepareLaunch();
      });
      expect(createDeployment).toHaveBeenCalledWith(
        expect.objectContaining({ mechanisms: ['managed_integration', 'ecf'] })
      );
    });

    it('stores the integration name and description with each request and on the deployment', async () => {
      const { result } = render({
        serviceSettings: {
          ...serviceSettings,
          integrationName: ' aws-production ',
          description: 'Production AWS account',
        },
      });

      await act(async () => {
        await result.current.prepareLaunch();
      });

      // The server replays the requests as they are stored, so the policy name and description
      // are settled at Launch, the way a deploy from the form would settle them.
      expect(mockedBuildRequest).toHaveBeenCalledWith(
        deployGroups[0],
        expect.objectContaining({
          integrationName: 'aws-production',
          description: 'Production AWS account',
        })
      );
      expect(createDeployment).toHaveBeenCalledWith(
        expect.objectContaining({
          integrationName: 'aws-production',
          description: 'Production AWS account',
        })
      );
    });

    it('returns undefined when the deployment could not be created', async () => {
      createDeployment.mockResolvedValue(null);
      const { result } = render();

      let prepared: unknown = 'unset';
      await act(async () => {
        prepared = await result.current.prepareLaunch();
      });

      expect(prepared).toBeUndefined();
      expect(updateDetectAndReviewStep).not.toHaveBeenCalled();
    });

    it('returns undefined without creating anything when the deploy cannot be automatic', async () => {
      flow({ onboardingDeploymentId: 'dep-0' });
      const { result } = render();

      let prepared: unknown = 'unset';
      await act(async () => {
        prepared = await result.current.prepareLaunch();
      });

      expect(prepared).toBeUndefined();
      expect(createDeployment).not.toHaveBeenCalled();
    });
  });
});
