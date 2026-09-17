/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, act } from '@testing-library/react';

jest.mock('./use_aws_service_matrix', () => ({
  useAwsServiceMatrix: jest
    .fn()
    .mockReturnValue({ matrix: [], isError: false, refetch: jest.fn() }),
}));

import { OnboardingFlowProvider, useOnboardingFlow } from './onboarding_flow_context';

jest.mock('react-use/lib/useSessionStorage', () => jest.fn());

import useSessionStorage from 'react-use/lib/useSessionStorage';

const mockUseSessionStorage = useSessionStorage as jest.Mock;

// Stateful mock: tracks the stored value per key and triggers re-renders by re-calling the setter.
// The setter updates the store and returns a fresh value on the next call, which is what the
// context's persistedDetectAndReviewStepRef needs to merge correctly across multiple updates.
function makeStatefulStorageMock() {
  const stores: Record<string, unknown> = {};
  const setters: Record<string, jest.Mock> = {};

  return (key: string, defaultValue: unknown) => {
    if (!(key in stores)) stores[key] = defaultValue;
    if (!setters[key]) {
      setters[key] = jest.fn((value: unknown) => {
        stores[key] = value;
      });
    }
    return [stores[key], setters[key]];
  };
}

function wrapper({ children }: { children: React.ReactNode }) {
  return <OnboardingFlowProvider>{children}</OnboardingFlowProvider>;
}

describe('OnboardingFlowProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSessionStorage.mockImplementation(makeStatefulStorageMock());
  });

  describe('updateDetectAndReviewStep', () => {
    it('merges serviceStatuses additively — new keys do not overwrite existing ones', () => {
      const { result, rerender } = renderHook(() => useOnboardingFlow(), { wrapper });

      act(() => {
        result.current.updateDetectAndReviewStep({
          serviceStatuses: { inst_a: 'instantiating' },
        });
      });
      rerender();

      act(() => {
        result.current.updateDetectAndReviewStep({
          serviceStatuses: { inst_b: 'receiving' },
        });
      });
      rerender();

      // After two additive updates, both keys must be present in serviceStatuses.
      expect(result.current.detectAndReviewStep.serviceStatuses).toMatchObject({
        inst_a: 'instantiating',
        inst_b: 'receiving',
      });
    });

    it('replaces failedInstances outright — does not merge with previous value', () => {
      const { result, rerender } = renderHook(() => useOnboardingFlow(), { wrapper });

      act(() => {
        result.current.updateDetectAndReviewStep({ failedInstances: ['inst_a', 'inst_b'] });
      });
      rerender();

      act(() => {
        result.current.updateDetectAndReviewStep({ failedInstances: ['inst_c'] });
      });
      rerender();

      // Only the latest value — inst_a and inst_b must be gone.
      expect(result.current.detectAndReviewStep.failedInstances).toEqual(['inst_c']);
    });

    it('merges policyIdsByInstance additively', () => {
      const { result, rerender } = renderHook(() => useOnboardingFlow(), { wrapper });

      act(() => {
        result.current.updateDetectAndReviewStep({
          policyIdsByInstance: { inst_a: 'policy-1' },
        });
      });
      rerender();

      act(() => {
        result.current.updateDetectAndReviewStep({
          policyIdsByInstance: { inst_b: 'policy-2' },
        });
      });
      rerender();

      expect(result.current.detectAndReviewStep.policyIdsByInstance).toMatchObject({
        inst_a: 'policy-1',
        inst_b: 'policy-2',
      });
    });

    it('replaces deployErrors outright when provided', () => {
      const { result, rerender } = renderHook(() => useOnboardingFlow(), { wrapper });

      act(() => {
        result.current.updateDetectAndReviewStep({ deployErrors: { inst_a: 'timeout' } });
      });
      rerender();

      act(() => {
        result.current.updateDetectAndReviewStep({ deployErrors: {} });
      });
      rerender();

      expect(result.current.detectAndReviewStep.deployErrors).toEqual({});
    });

    it('sets isDeploying without touching persisted storage', () => {
      const { result } = renderHook(() => useOnboardingFlow(), { wrapper });

      expect(result.current.detectAndReviewStep.isDeploying).toBe(false);

      act(() => {
        result.current.updateDetectAndReviewStep({ isDeploying: true });
      });

      expect(result.current.detectAndReviewStep.isDeploying).toBe(true);
    });

    it('preserves onboardingDeploymentId across subsequent updates that do not include it', () => {
      const { result, rerender } = renderHook(() => useOnboardingFlow(), { wrapper });

      act(() => {
        result.current.updateDetectAndReviewStep({ onboardingDeploymentId: 'dep-abc' });
      });
      rerender();

      act(() => {
        result.current.updateDetectAndReviewStep({ failedInstances: ['inst_x'] });
      });
      rerender();

      expect(result.current.detectAndReviewStep.onboardingDeploymentId).toBe('dep-abc');
    });
  });

  describe('removeDeployInstance', () => {
    it('preserves onboardingDeploymentId when removing an instance', () => {
      const { result, rerender } = renderHook(() => useOnboardingFlow(), { wrapper });

      act(() => {
        result.current.updateDetectAndReviewStep({
          onboardingDeploymentId: 'dep-xyz',
          serviceStatuses: { inst_a: 'receiving' },
          policyIdsByInstance: { inst_a: 'p-1' },
        });
      });
      rerender();

      act(() => {
        result.current.removeDeployInstance('inst_a');
      });
      rerender();

      expect(result.current.detectAndReviewStep.onboardingDeploymentId).toBe('dep-xyz');
    });
  });

  describe('getLatestFailedInstances', () => {
    it('returns the current failedInstances, not a stale closure value', () => {
      const { result, rerender } = renderHook(() => useOnboardingFlow(), { wrapper });

      act(() => {
        result.current.updateDetectAndReviewStep({ failedInstances: ['inst_x'] });
      });
      rerender();

      expect(result.current.getLatestFailedInstances()).toEqual(['inst_x']);
    });
  });

  describe('pendingIacTemplate', () => {
    // Template details of a stack update the user launched for an existing Federated Identity, held
    // until Deploy succeeds.
    const pendingIacTemplate = {
      connectorId: 'connector-1',
      iac_key: 'sha256:new',
      iac_blueprint_id: 'federated-identity',
      iac_blueprint_version: '1.0.0',
    };

    it('is undefined by default and is exposed once set', () => {
      const { result } = renderHook(() => useOnboardingFlow(), { wrapper });
      expect(result.current.authenticateAndDeployStep.pendingIacTemplate).toBeUndefined();

      act(() => {
        result.current.setPendingIacTemplate(pendingIacTemplate);
      });

      expect(result.current.authenticateAndDeployStep.pendingIacTemplate).toEqual(
        pendingIacTemplate
      );
    });

    it('is not written to session storage', () => {
      const { result } = renderHook(() => useOnboardingFlow(), { wrapper });

      act(() => {
        result.current.setPendingIacTemplate(pendingIacTemplate);
      });

      const persistedWrites = mockUseSessionStorage.mock.results
        .map((r) => (r.value as [unknown, jest.Mock])[1])
        .flatMap((setter) => setter.mock.calls.map(([value]: [unknown]) => value));
      expect(JSON.stringify(persistedWrites)).not.toContain('sha256:new');
    });

    it('survives setConnectorId re-emitting the same id', () => {
      const { result, rerender } = renderHook(() => useOnboardingFlow(), { wrapper });

      act(() => {
        result.current.setConnectorId('connector-1', 'Identity 1');
      });
      rerender();
      act(() => {
        result.current.setPendingIacTemplate(pendingIacTemplate);
      });
      rerender();

      // The Fleet component calls this on every readiness change with the unchanged selection.
      act(() => {
        result.current.setConnectorId('connector-1', 'Identity 1');
      });
      rerender();

      expect(result.current.authenticateAndDeployStep.pendingIacTemplate).toEqual(
        pendingIacTemplate
      );
    });

    it('is cleared when a different connector is selected', () => {
      const { result, rerender } = renderHook(() => useOnboardingFlow(), { wrapper });

      act(() => {
        result.current.setConnectorId('connector-1', 'Identity 1');
      });
      rerender();
      act(() => {
        result.current.setPendingIacTemplate(pendingIacTemplate);
      });
      rerender();

      act(() => {
        result.current.setConnectorId('connector-2', 'Identity 2');
      });
      rerender();

      expect(result.current.authenticateAndDeployStep.pendingIacTemplate).toBeUndefined();
    });

    it('is cleared when the selected services change: the template was rendered for the old set', () => {
      // Launch for set A → Back → drop a service → return → Deploy must not record A's digest.
      const { result, rerender } = renderHook(() => useOnboardingFlow(), { wrapper });

      act(() => {
        result.current.setConnectorId('connector-1', 'Identity 1');
      });
      rerender();
      act(() => {
        result.current.setPendingIacTemplate(pendingIacTemplate);
      });
      rerender();

      act(() => {
        result.current.setSelectedServiceIds(['ec2']);
      });
      rerender();

      expect(result.current.authenticateAndDeployStep.pendingIacTemplate).toBeUndefined();
    });

    it('is cleared when the data format changes, which empties the selection', () => {
      const { result, rerender } = renderHook(() => useOnboardingFlow(), { wrapper });

      act(() => {
        result.current.setPendingIacTemplate(pendingIacTemplate);
      });
      rerender();

      act(() => {
        result.current.setDataFormat('otel');
      });
      rerender();

      expect(result.current.authenticateAndDeployStep.pendingIacTemplate).toBeUndefined();
    });

    it('is cleared when static keys replace the identity', () => {
      const { result, rerender } = renderHook(() => useOnboardingFlow(), { wrapper });

      act(() => {
        result.current.setConnectorId('connector-1', 'Identity 1');
      });
      rerender();
      act(() => {
        result.current.setPendingIacTemplate(pendingIacTemplate);
      });
      rerender();

      act(() => {
        result.current.setStaticKeys({ access_key_id: 'AKIA', secret_access_key: 'secret' });
      });
      rerender();

      expect(result.current.authenticateAndDeployStep.pendingIacTemplate).toBeUndefined();
    });
  });

  describe('setDeploymentMethod', () => {
    // Regression: a failed deploy under one method left failedInstances populated, so switching
    // method (or restarting onboarding into the other method) showed a stale "Deployment failed"
    // callout for a deploy the user never attempted under the new method.
    it('clears deploy results when the method changes', () => {
      const { result, rerender } = renderHook(() => useOnboardingFlow(), { wrapper });

      act(() => {
        result.current.updateDetectAndReviewStep({
          failedInstances: ['inst_x'],
          serviceStatuses: { inst_x: 'error' },
          deployErrors: { inst_x: 'boom' },
        });
      });
      rerender();
      expect(result.current.detectAndReviewStep.failedInstances).toEqual(['inst_x']);

      act(() => {
        result.current.setDeploymentMethod('agent_based');
      });
      rerender();

      expect(result.current.detectAndReviewStep.failedInstances).toEqual([]);
      expect(result.current.detectAndReviewStep.serviceStatuses).toEqual({});
      expect(result.current.detectAndReviewStep.deployErrors).toEqual({});
      expect(result.current.deploymentMethod).toBe('agent_based');
    });

    it('clears the persisted agentPolicyId so the new method cannot inherit it', () => {
      const { result, rerender } = renderHook(() => useOnboardingFlow(), { wrapper });

      act(() => {
        result.current.setDeploymentMethod('agent_based');
      });
      rerender();
      act(() => {
        result.current.setAgentBasedDeployment({
          agentPolicyId: 'policy-1',
          agentPolicyName: 'AWS Onboarding',
        });
      });
      rerender();
      expect(result.current.agentBasedDeployment.agentPolicyId).toBe('policy-1');

      act(() => {
        result.current.setDeploymentMethod('managed_integration');
      });
      rerender();

      expect(result.current.agentBasedDeployment.agentPolicyId).toBeUndefined();
      expect(result.current.agentBasedDeployment.agentPolicyName).toBeUndefined();
    });

    it('is a no-op when the method is unchanged, preserving an in-progress deploy', () => {
      const { result, rerender } = renderHook(() => useOnboardingFlow(), { wrapper });

      act(() => {
        result.current.updateDetectAndReviewStep({ failedInstances: ['inst_x'] });
      });
      rerender();

      act(() => {
        // 'managed_integration' is the default, so this must not wipe deploy state.
        result.current.setDeploymentMethod('managed_integration');
      });
      rerender();

      expect(result.current.detectAndReviewStep.failedInstances).toEqual(['inst_x']);
    });
  });
});
