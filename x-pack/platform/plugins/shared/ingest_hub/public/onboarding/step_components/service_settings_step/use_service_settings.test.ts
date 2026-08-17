/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import { useState } from 'react';
import useSessionStorage from 'react-use/lib/useSessionStorage';

jest.mock('react-use/lib/useSessionStorage');
jest.mock('../../onboarding_flow_context', () => ({
  useOnboardingFlow: jest.fn(),
}));

import { useOnboardingFlow } from '../../onboarding_flow_context';
import { useServiceSettings } from './use_service_settings';
import { AWS_SERVICES_MAP } from '../../aws_service_matrix';

const mockUseOnboardingFlow = useOnboardingFlow as jest.MockedFunction<typeof useOnboardingFlow>;
const mockUseSessionStorage = useSessionStorage as jest.MockedFunction<typeof useSessionStorage>;

beforeEach(() => {
  mockUseSessionStorage.mockImplementation((_key, initial) => useState(initial));
  mockUseOnboardingFlow.mockReturnValue({
    servicesStep: { selectedServiceIds: ['guardduty'] },
    removeDeployInstance: jest.fn(),
    awsServicesMap: AWS_SERVICES_MAP,
  } as unknown as ReturnType<typeof useOnboardingFlow>);
});

describe('useServiceSettings — addDuplicate instanceId generation', () => {
  it('assigns __dup-1 for the first duplicate', () => {
    const { result } = renderHook(() => useServiceSettings({ onContinue: jest.fn() }));

    act(() => {
      result.current.addDuplicate('guardduty', 'AWS GuardDuty [Duplicate]', {}, null);
    });

    const ids = result.current.instances.map((i) => i.instanceId);
    expect(ids).toContain('guardduty__dup-1');
  });

  it('assigns __dup-2 for the second duplicate', () => {
    const { result } = renderHook(() => useServiceSettings({ onContinue: jest.fn() }));

    act(() => {
      result.current.addDuplicate('guardduty', 'AWS GuardDuty [Duplicate]', {}, null);
    });
    act(() => {
      result.current.addDuplicate('guardduty', 'AWS GuardDuty [Duplicate 2]', {}, null);
    });

    const ids = result.current.instances.map((i) => i.instanceId);
    expect(ids).toContain('guardduty__dup-1');
    expect(ids).toContain('guardduty__dup-2');
  });

  it('skips already-used id after remove+re-duplicate', () => {
    // Reproduces the collision scenario from the reviewer comment:
    // dup __dup-1 and __dup-2 exist; remove __dup-1; duplicate again.
    // Without the while-loop fix the new id would be __dup-2 (collision).
    // With the fix it must be __dup-3.
    const { result } = renderHook(() => useServiceSettings({ onContinue: jest.fn() }));

    act(() => {
      result.current.addDuplicate('guardduty', 'AWS GuardDuty [Duplicate]', {}, null);
    });
    act(() => {
      result.current.addDuplicate('guardduty', 'AWS GuardDuty [Duplicate 2]', {}, null);
    });
    act(() => {
      result.current.removeInstance('guardduty__dup-1');
    });
    act(() => {
      result.current.addDuplicate('guardduty', 'AWS GuardDuty [Duplicate 3]', {}, null);
    });

    const ids = result.current.instances.map((i) => i.instanceId);
    expect(ids).not.toContain('guardduty__dup-1'); // removed
    expect(ids).toContain('guardduty__dup-2'); // still present
    expect(ids).toContain('guardduty__dup-3'); // new — not a collision
    expect(new Set(ids).size).toBe(ids.length); // all unique
  });
});
