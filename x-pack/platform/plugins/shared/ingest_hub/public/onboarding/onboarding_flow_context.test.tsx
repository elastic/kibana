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
// context's persistedDeployAndDetectStepRef needs to merge correctly across multiple updates.
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

  describe('updateDeployAndDetectStep', () => {
    it('merges serviceStatuses additively — new keys do not overwrite existing ones', () => {
      const { result, rerender } = renderHook(() => useOnboardingFlow(), { wrapper });

      act(() => {
        result.current.updateDeployAndDetectStep({
          serviceStatuses: { inst_a: 'instantiating' },
        });
      });
      rerender();

      act(() => {
        result.current.updateDeployAndDetectStep({
          serviceStatuses: { inst_b: 'receiving' },
        });
      });
      rerender();

      // After two additive updates, both keys must be present in serviceStatuses.
      expect(result.current.deployAndDetectStep.serviceStatuses).toMatchObject({
        inst_a: 'instantiating',
        inst_b: 'receiving',
      });
    });

    it('replaces failedInstances outright — does not merge with previous value', () => {
      const { result, rerender } = renderHook(() => useOnboardingFlow(), { wrapper });

      act(() => {
        result.current.updateDeployAndDetectStep({ failedInstances: ['inst_a', 'inst_b'] });
      });
      rerender();

      act(() => {
        result.current.updateDeployAndDetectStep({ failedInstances: ['inst_c'] });
      });
      rerender();

      // Only the latest value — inst_a and inst_b must be gone.
      expect(result.current.deployAndDetectStep.failedInstances).toEqual(['inst_c']);
    });

    it('merges policyIdsByInstance additively', () => {
      const { result, rerender } = renderHook(() => useOnboardingFlow(), { wrapper });

      act(() => {
        result.current.updateDeployAndDetectStep({
          policyIdsByInstance: { inst_a: 'policy-1' },
        });
      });
      rerender();

      act(() => {
        result.current.updateDeployAndDetectStep({
          policyIdsByInstance: { inst_b: 'policy-2' },
        });
      });
      rerender();

      expect(result.current.deployAndDetectStep.policyIdsByInstance).toMatchObject({
        inst_a: 'policy-1',
        inst_b: 'policy-2',
      });
    });

    it('replaces deployErrors outright when provided', () => {
      const { result, rerender } = renderHook(() => useOnboardingFlow(), { wrapper });

      act(() => {
        result.current.updateDeployAndDetectStep({ deployErrors: { inst_a: 'timeout' } });
      });
      rerender();

      act(() => {
        result.current.updateDeployAndDetectStep({ deployErrors: {} });
      });
      rerender();

      expect(result.current.deployAndDetectStep.deployErrors).toEqual({});
    });

    it('sets isDeploying without touching persisted storage', () => {
      const { result } = renderHook(() => useOnboardingFlow(), { wrapper });

      expect(result.current.deployAndDetectStep.isDeploying).toBe(false);

      act(() => {
        result.current.updateDeployAndDetectStep({ isDeploying: true });
      });

      expect(result.current.deployAndDetectStep.isDeploying).toBe(true);
    });
  });

  describe('getLatestFailedInstances', () => {
    it('returns the current failedInstances, not a stale closure value', () => {
      const { result, rerender } = renderHook(() => useOnboardingFlow(), { wrapper });

      act(() => {
        result.current.updateDeployAndDetectStep({ failedInstances: ['inst_x'] });
      });
      rerender();

      expect(result.current.getLatestFailedInstances()).toEqual(['inst_x']);
    });
  });

  describe('retryDeploy', () => {
    it('calls the registered deploy handler with the provided instance ids', () => {
      const { result } = renderHook(() => useOnboardingFlow(), { wrapper });
      const handler = jest.fn();

      act(() => {
        result.current.registerDeployHandler(handler);
      });

      act(() => {
        result.current.retryDeploy(['inst_a', 'inst_b']);
      });

      expect(handler).toHaveBeenCalledWith(['inst_a', 'inst_b']);
    });

    it('does nothing when no handler is registered', () => {
      const { result } = renderHook(() => useOnboardingFlow(), { wrapper });
      expect(() => result.current.retryDeploy(['inst_a'])).not.toThrow();
    });
  });
});
