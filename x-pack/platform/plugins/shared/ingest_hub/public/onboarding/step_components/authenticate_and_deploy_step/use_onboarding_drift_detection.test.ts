/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';

import type { AwsServiceMatrixEntry } from '../../aws_service_matrix';
import type { ServiceSettingsPersistedState } from '../service_settings_step/use_service_settings';
import { useOnboardingDriftDetection } from './use_onboarding_drift_detection';

const mockSendGet = jest.fn();
jest.mock('@kbn/fleet-plugin/public', () => ({
  sendGetCloudOnboardingDeployment: (...args: unknown[]) => mockSendGet(...args),
}));

const ELB = {
  id: 'elb',
  name: 'ELB',
  packageName: 'aws',
  isManifestLoaded: true,
  dataStreams: [],
  deploymentMethods: [{ method: 'managed_integration', preferred: true }],
} as unknown as AwsServiceMatrixEntry;

const ORIGINAL = { instanceId: 'elb', serviceId: 'elb', name: 'ELB', isDuplicate: false };

const setup = (serviceSettings: ServiceSettingsPersistedState, soItem: Record<string, unknown>) => {
  mockSendGet.mockResolvedValue({
    item: { services: ['elb'], serviceVars: {}, authMethod: undefined, ...soItem },
  });
  const updateDetectAndReviewStep = jest.fn();
  const { result } = renderHook(() =>
    useOnboardingDriftDetection({
      onboardingDeploymentId: 'dep-1',
      policyIdsByInstance: { elb: 'policy-1' },
      awsServicesMap: new Map([['elb', ELB]]),
      deploymentMethod: 'managed_integration',
      connectorId: undefined,
      agentBasedDeployment: {
        agentCredentialMethod: undefined,
        agentHostsMode: 'new',
        selectedAgentPolicyIds: [],
      },
      serviceSettings,
      isDirty: false,
      updateDetectAndReviewStep,
    })
  );
  return { result, updateDetectAndReviewStep };
};

describe('useOnboardingDriftDetection — global namespace', () => {
  beforeEach(() => jest.clearAllMocks());

  it('marks the deployment dirty when the namespace changed since the last deploy', async () => {
    const { result, updateDetectAndReviewStep } = setup(
      { globalRegion: 'us-east-1', namespace: 'prod', serviceVars: {}, instances: [ORIGINAL] },
      {}
    );

    await waitFor(() => expect(result.current.driftSettled).toBe(true));
    expect(updateDetectAndReviewStep).toHaveBeenCalledWith(
      expect.objectContaining({ isDirty: true })
    );
  });

  it('detects it in a session that has no instances yet', async () => {
    const { result, updateDetectAndReviewStep } = setup(
      { globalRegion: 'us-east-1', namespace: 'prod', serviceVars: {} },
      {}
    );

    await waitFor(() => expect(result.current.driftSettled).toBe(true));
    expect(updateDetectAndReviewStep).toHaveBeenCalledWith(
      expect.objectContaining({ isDirty: true })
    );
  });

  it('stays clean when the namespace is the one that was deployed', async () => {
    const { result, updateDetectAndReviewStep } = setup(
      { globalRegion: 'us-east-1', namespace: 'prod', serviceVars: {}, instances: [ORIGINAL] },
      { namespace: 'prod' }
    );

    await waitFor(() => expect(result.current.driftSettled).toBe(true));
    expect(updateDetectAndReviewStep).toHaveBeenCalledWith(
      expect.objectContaining({ isDirty: false })
    );
  });
});
