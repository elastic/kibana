/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act, waitFor } from '@testing-library/react';

jest.mock('@kbn/fleet-plugin/public', () => ({
  CLOUD_CONNECTOR_RENDER_FLOW: 'cloud_connector',
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

const BASE_INSTANCES = [
  { instanceId: 'guardduty', serviceId: 'guardduty' },
  { instanceId: 'cloudtrail', serviceId: 'cloudtrail' },
];

describe('useResolveIacBlueprints', () => {
  let invalidateIacBlueprintCoverage: jest.Mock;
  let commitIacBlueprintCoverage: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    // Mirrors the provider: every invalidation issues a fresh token.
    let token = 0;
    invalidateIacBlueprintCoverage = jest.fn(() => ++token);
    commitIacBlueprintCoverage = jest.fn();
    mockUseIacProvisioner.mockReturnValue({ isIacProvisionerEnabled: true });
    mockUseOnboardingFlow.mockReturnValue({
      awsServicesMap: new Map([
        ['guardduty', guarddutyService],
        ['cloudtrail', ecfOnlyService],
      ]),
      invalidateIacBlueprintCoverage,
      commitIacBlueprintCoverage,
    });
  });

  it('resolves only managed-integration services and commits the coverage', async () => {
    mockSendResolve.mockResolvedValue({ data: DEPLOYABLE_COVERAGE, error: null });

    const { result } = renderHook(() => useResolveIacBlueprints());
    act(() => {
      result.current(BASE_INSTANCES, {});
    });

    expect(mockSendResolve).toHaveBeenCalledWith({
      provider: 'aws',
      flow: 'cloud_connector',
      integrations: [
        {
          name: 'aws',
          policyTemplates: [{ name: 'guardduty', enabledInputs: ['aws-s3'] }],
        },
      ],
    });
    // Stale coverage is invalidated synchronously, then the response commits
    // against the token that invalidation issued.
    expect(invalidateIacBlueprintCoverage).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(commitIacBlueprintCoverage).toHaveBeenCalledWith(1, DEPLOYABLE_COVERAGE.blueprints);
    });
  });

  it('does nothing when the IaC Provisioner is disabled', () => {
    mockUseIacProvisioner.mockReturnValue({ isIacProvisionerEnabled: false });

    const { result } = renderHook(() => useResolveIacBlueprints());
    act(() => {
      result.current(BASE_INSTANCES, {});
    });

    expect(mockSendResolve).not.toHaveBeenCalled();
    expect(invalidateIacBlueprintCoverage).not.toHaveBeenCalled();
    expect(commitIacBlueprintCoverage).not.toHaveBeenCalled();
  });

  it('invalidates coverage without calling resolve when nothing is resolvable', () => {
    mockUseOnboardingFlow.mockReturnValue({
      awsServicesMap: new Map([['cloudtrail', ecfOnlyService]]),
      invalidateIacBlueprintCoverage,
      commitIacBlueprintCoverage,
    });

    const { result } = renderHook(() => useResolveIacBlueprints());
    act(() => {
      result.current([{ instanceId: 'cloudtrail', serviceId: 'cloudtrail' }], {});
    });

    expect(mockSendResolve).not.toHaveBeenCalled();
    expect(invalidateIacBlueprintCoverage).toHaveBeenCalledTimes(1);
    expect(commitIacBlueprintCoverage).not.toHaveBeenCalled();
  });

  it('commits nothing when the resolve call returns an error', async () => {
    mockSendResolve.mockResolvedValue({
      data: null,
      error: { message: 'unavailable', statusCode: 502 },
    });

    const { result } = renderHook(() => useResolveIacBlueprints());
    act(() => {
      result.current(BASE_INSTANCES, {});
    });

    await waitFor(() => {
      expect(mockSendResolve).toHaveBeenCalled();
    });
    expect(commitIacBlueprintCoverage).not.toHaveBeenCalled();
  });

  it('commits each response with the token issued for its own request', async () => {
    // A slow first response must carry its own (stale) token so the provider
    // can discard it — even when the hook remounted in between, as Back/Next
    // navigation does.
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

    const { result, unmount } = renderHook(() => useResolveIacBlueprints());
    act(() => {
      result.current(BASE_INSTANCES, {});
    });
    // Simulate the Back/Next remount that resets any hook-local state.
    unmount();
    const { result: remounted } = renderHook(() => useResolveIacBlueprints());
    act(() => {
      remounted.current(BASE_INSTANCES, {});
    });

    await waitFor(() => {
      expect(commitIacBlueprintCoverage).toHaveBeenCalledWith(2, DEPLOYABLE_COVERAGE.blueprints);
    });

    act(() => {
      resolveFirst({ data: STALE_COVERAGE, error: null });
    });
    await act(async () => {
      await first;
    });

    // The late response still presents token 1, which the provider treats as stale.
    expect(commitIacBlueprintCoverage).toHaveBeenCalledWith(1, STALE_COVERAGE.blueprints);
    expect(commitIacBlueprintCoverage).not.toHaveBeenCalledWith(2, STALE_COVERAGE.blueprints);
  });

  it('swallows a rejected resolve call', async () => {
    mockSendResolve.mockRejectedValue(new Error('network down'));

    const { result } = renderHook(() => useResolveIacBlueprints());
    expect(() => {
      act(() => {
        result.current(BASE_INSTANCES, {});
      });
    }).not.toThrow();

    await waitFor(() => {
      expect(mockSendResolve).toHaveBeenCalled();
    });
    expect(commitIacBlueprintCoverage).not.toHaveBeenCalled();
  });
});
