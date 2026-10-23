/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';

jest.mock('@kbn/fleet-plugin/public', () => ({ sendGetCloudOnboardingDeployment: jest.fn() }));

import { sendGetCloudOnboardingDeployment } from '@kbn/fleet-plugin/public';
import type { ServiceInstance } from '../service_settings_step/use_service_settings';
import { useOnboardingDriftDetection } from './use_onboarding_drift_detection';

const mockGetDeployment = sendGetCloudOnboardingDeployment as jest.Mock;

const INSTANCE_ID = 'cloudtrail';

const instance: ServiceInstance = {
  instanceId: INSTANCE_ID,
  serviceId: INSTANCE_ID,
  name: 'CloudTrail',
  isDuplicate: false,
};

const makeVars = (enabledDataStreams: string[]) => ({ enabledDataStreams, varsByDataStream: {} });

/**
 * Pins how the drift check depends on `serviceSettings.instances`. The instances are what scope
 * service-var drift to deployed, still-selected instances; with none, var drift is never raised
 * (auth and agent-policy drift are independent of them).
 */
describe('useOnboardingDriftDetection — dependence on serviceSettings.instances', () => {
  const updateDetectAndReviewStep = jest.fn();

  const renderDrift = ({
    instances,
    connectorId = 'connector-1',
  }: {
    instances: ServiceInstance[] | undefined;
    connectorId?: string;
  }) =>
    renderHook(() =>
      useOnboardingDriftDetection({
        onboardingDeploymentId: 'deployment-1',
        policyIdsByInstance: { [INSTANCE_ID]: 'policy-1' },
        // An empty (but defined) map: no manifest to wait for, and toSOServiceVars copies the vars.
        awsServicesMap: new Map(),
        deploymentMethod: 'managed_integration',
        connectorId,
        agentBasedDeployment: {
          agentCredentialMethod: undefined,
          agentHostsMode: 'new',
          selectedAgentPolicyIds: [],
        },
        // Session vars differ from the saved ones below.
        serviceSettings: {
          globalRegion: 'us-east-1',
          serviceVars: { [INSTANCE_ID]: makeVars(['logs', 'metrics']) },
          instances,
        },
        isDirty: false,
        updateDetectAndReviewStep,
      })
    );

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetDeployment.mockResolvedValue({
      item: {
        connectorId: 'connector-1',
        serviceVars: { [INSTANCE_ID]: makeVars(['logs']) },
      },
    });
  });

  it('flags var drift for a deployed instance that is listed in instances', async () => {
    const { result } = renderDrift({ instances: [instance] });

    await waitFor(() => expect(result.current.driftSettled).toBe(true));
    expect(updateDetectAndReviewStep).toHaveBeenCalledWith({
      isDirty: true,
      isAuthDirty: false,
      isPolicySelectionDirty: false,
    });
  });

  it.each([
    ['empty', [] as ServiceInstance[]],
    ['absent', undefined],
  ])('raises no var drift when instances are %s', async (_label, instances) => {
    const { result } = renderDrift({ instances });

    await waitFor(() => expect(result.current.driftSettled).toBe(true));
    expect(updateDetectAndReviewStep).toHaveBeenCalledWith({
      isDirty: false,
      isAuthDirty: false,
      isPolicySelectionDirty: false,
    });
  });

  it('still raises auth drift when instances are empty', async () => {
    const { result } = renderDrift({ instances: [], connectorId: 'connector-2' });

    await waitFor(() => expect(result.current.driftSettled).toBe(true));
    expect(updateDetectAndReviewStep).toHaveBeenCalledWith({
      isDirty: true,
      isAuthDirty: true,
      isPolicySelectionDirty: false,
    });
  });
});
