/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';

jest.mock('@kbn/fleet-plugin/public', () => ({ sendGetCloudOnboardingDeployment: jest.fn() }));

import { sendGetCloudOnboardingDeployment } from '@kbn/fleet-plugin/public';
import type { AwsServiceMatrixEntry } from '../../aws_service_matrix';
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
    awsServicesMap = new Map(),
  }: {
    instances: ServiceInstance[] | undefined;
    connectorId?: string;
    awsServicesMap?: Map<string, AwsServiceMatrixEntry>;
  }) =>
    renderHook(
      ({ servicesMap }: { servicesMap: Map<string, AwsServiceMatrixEntry> }) =>
        useOnboardingDriftDetection({
          onboardingDeploymentId: 'deployment-1',
          policyIdsByInstance: { [INSTANCE_ID]: 'policy-1' },
          // By default an empty (but defined) map: no manifest to wait for, and toSOServiceVars
          // copies the vars.
          awsServicesMap: servicesMap,
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
        }),
      { initialProps: { servicesMap: awsServicesMap } }
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

  describe('while the manifest of a deployed instance is loading', () => {
    // Session and saved vars are both empty, so the comparison itself is clean; what matters is
    // when the check runs.
    const entry = (overrides: Record<string, unknown>) =>
      new Map([
        [
          INSTANCE_ID,
          { id: INSTANCE_ID, isManifestLoaded: false, isManifestError: false, ...overrides },
        ],
      ]) as unknown as Map<string, AwsServiceMatrixEntry>;

    it('does not check for drift, then checks once when the manifest has loaded', async () => {
      const { result, rerender } = renderDrift({
        instances: [instance],
        awsServicesMap: entry({}),
      });
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(mockGetDeployment).not.toHaveBeenCalled();
      expect(updateDetectAndReviewStep).not.toHaveBeenCalled();
      expect(result.current.driftSettled).toBe(false);

      rerender({ servicesMap: entry({ isManifestLoaded: true }) });

      await waitFor(() => expect(result.current.driftSettled).toBe(true));
      expect(mockGetDeployment).toHaveBeenCalledTimes(1);
      expect(updateDetectAndReviewStep).toHaveBeenCalledTimes(1);
    });

    it('checks once the manifest failed to load, instead of waiting forever', async () => {
      const { result } = renderDrift({
        instances: [instance],
        awsServicesMap: entry({ isManifestError: true }),
      });

      await waitFor(() => expect(result.current.driftSettled).toBe(true));
      expect(mockGetDeployment).toHaveBeenCalledTimes(1);
    });

    it('does not wait for manifests when there are no stored instances', async () => {
      const { result } = renderDrift({ instances: [], awsServicesMap: entry({}) });

      await waitFor(() => expect(result.current.driftSettled).toBe(true));
      expect(mockGetDeployment).toHaveBeenCalledTimes(1);
    });
  });
});
