/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act, waitFor } from '@testing-library/react';

jest.mock('@kbn/fleet-plugin/public', () => ({
  UNIFIED_ONBOARDING_RENDER_FLOW: 'unified_onboarding',
  sendResolveIacBlueprints: jest.fn(),
  useIacProvisioner: jest.fn(),
}));
jest.mock('./onboarding_flow_context', () => ({
  useOnboardingFlow: jest.fn(),
}));

import { sendResolveIacBlueprints, useIacProvisioner } from '@kbn/fleet-plugin/public';
import { useOnboardingFlow } from './onboarding_flow_context';
import { useResolveIacBlueprints } from './use_resolve_iac_blueprints';
import type { AwsServiceMatrixEntry } from './aws_service_matrix';

const mockSendResolve = sendResolveIacBlueprints as jest.Mock;
const mockUseIacProvisioner = useIacProvisioner as jest.Mock;
const mockUseOnboardingFlow = useOnboardingFlow as jest.Mock;

const guarddutyService = {
  id: 'guardduty',
  name: 'AWS GuardDuty',
  packageName: 'aws',
  policyTemplate: 'guardduty',
  dataStreams: [],
  inputs: ['aws-s3'],
  defaultEnabledInputs: ['aws-s3'],
  deploymentMethods: [{ method: 'managed_integration', preferred: true }],
  identityFederationSupported: true,
  showInUI: true,
} as unknown as AwsServiceMatrixEntry;

const ecfOnlyService = {
  ...guarddutyService,
  id: 'cloudtrail',
  name: 'AWS CloudTrail',
  policyTemplate: 'cloudtrail',
  deploymentMethods: [{ method: 'ecf', preferred: true }],
} as unknown as AwsServiceMatrixEntry;

const DEPLOYABLE_COVERAGE = {
  blueprints: [
    {
      workflow: 'federated_identity',
      resolvedVersion: '1.0.0',
      deployable: true,
      notCovered: [],
    },
  ],
};

describe('useResolveIacBlueprints', () => {
  let setIacBlueprintCoverage: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    setIacBlueprintCoverage = jest.fn();
    mockUseIacProvisioner.mockReturnValue({ isIacProvisionerEnabled: true });
    mockUseOnboardingFlow.mockReturnValue({
      servicesStep: { selectedServiceIds: ['guardduty', 'cloudtrail'], dataFormat: 'json' },
      awsServicesMap: new Map([
        ['guardduty', guarddutyService],
        ['cloudtrail', ecfOnlyService],
      ]),
      setIacBlueprintCoverage,
    });
  });

  it('resolves only managed-integration services and stores the coverage', async () => {
    mockSendResolve.mockResolvedValue({ data: DEPLOYABLE_COVERAGE, error: null });

    const { result } = renderHook(() => useResolveIacBlueprints());
    act(() => {
      result.current({});
    });

    expect(mockSendResolve).toHaveBeenCalledWith({
      provider: 'aws',
      flow: 'unified_onboarding',
      integrations: [
        {
          name: 'aws',
          policyTemplates: [{ name: 'guardduty', enabledInputs: ['aws-s3'] }],
        },
      ],
    });
    // Stale coverage is dropped synchronously, then replaced when the call lands.
    expect(setIacBlueprintCoverage).toHaveBeenNthCalledWith(1, undefined);
    await waitFor(() => {
      expect(setIacBlueprintCoverage).toHaveBeenLastCalledWith(DEPLOYABLE_COVERAGE.blueprints);
    });
  });

  it('does nothing when the IaC Provisioner is disabled', () => {
    mockUseIacProvisioner.mockReturnValue({ isIacProvisionerEnabled: false });

    const { result } = renderHook(() => useResolveIacBlueprints());
    act(() => {
      result.current({});
    });

    expect(mockSendResolve).not.toHaveBeenCalled();
    expect(setIacBlueprintCoverage).not.toHaveBeenCalled();
  });

  it('clears coverage without calling resolve when nothing is resolvable', () => {
    mockUseOnboardingFlow.mockReturnValue({
      servicesStep: { selectedServiceIds: ['cloudtrail'], dataFormat: 'json' },
      awsServicesMap: new Map([['cloudtrail', ecfOnlyService]]),
      setIacBlueprintCoverage,
    });

    const { result } = renderHook(() => useResolveIacBlueprints());
    act(() => {
      result.current({});
    });

    expect(mockSendResolve).not.toHaveBeenCalled();
    expect(setIacBlueprintCoverage).toHaveBeenCalledWith(undefined);
  });

  it('leaves coverage unset when the resolve call returns an error', async () => {
    mockSendResolve.mockResolvedValue({
      data: null,
      error: { message: 'unavailable', statusCode: 502 },
    });

    const { result } = renderHook(() => useResolveIacBlueprints());
    act(() => {
      result.current({});
    });

    await waitFor(() => {
      expect(mockSendResolve).toHaveBeenCalled();
    });
    expect(setIacBlueprintCoverage).toHaveBeenCalledTimes(1);
    expect(setIacBlueprintCoverage).toHaveBeenCalledWith(undefined);
  });

  it('ignores a stale in-flight response settling after a newer call', async () => {
    let resolveFirst: (value: unknown) => void;
    const first = new Promise((resolve) => {
      resolveFirst = resolve;
    });
    const STALE_COVERAGE = {
      blueprints: [
        {
          workflow: 'federated_identity',
          resolvedVersion: null,
          deployable: false,
          notCovered: [],
        },
      ],
    };
    mockSendResolve
      .mockReturnValueOnce(first)
      .mockResolvedValueOnce({ data: DEPLOYABLE_COVERAGE, error: null });

    const { result } = renderHook(() => useResolveIacBlueprints());
    act(() => {
      result.current({});
    });
    act(() => {
      result.current({});
    });

    await waitFor(() => {
      expect(setIacBlueprintCoverage).toHaveBeenLastCalledWith(DEPLOYABLE_COVERAGE.blueprints);
    });

    // The first call settles last — its stale coverage must be discarded.
    act(() => {
      resolveFirst({ data: STALE_COVERAGE, error: null });
    });
    await act(async () => {
      await first;
    });

    expect(setIacBlueprintCoverage).toHaveBeenLastCalledWith(DEPLOYABLE_COVERAGE.blueprints);
    expect(setIacBlueprintCoverage).not.toHaveBeenCalledWith(STALE_COVERAGE.blueprints);
  });

  it('swallows a rejected resolve call', async () => {
    mockSendResolve.mockRejectedValue(new Error('network down'));

    const { result } = renderHook(() => useResolveIacBlueprints());
    expect(() => {
      act(() => {
        result.current({});
      });
    }).not.toThrow();

    await waitFor(() => {
      expect(mockSendResolve).toHaveBeenCalled();
    });
    expect(setIacBlueprintCoverage).toHaveBeenCalledTimes(1);
    expect(setIacBlueprintCoverage).toHaveBeenCalledWith(undefined);
  });
});
