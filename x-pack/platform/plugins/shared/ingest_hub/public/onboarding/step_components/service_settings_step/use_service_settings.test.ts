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
import type { AwsServiceMatrixEntry, ServiceVarDef } from '../../aws_service_matrix';
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

// --- helpers for synthetic matrix entries ---

function makeEntry(
  id: string,
  overrides: Partial<AwsServiceMatrixEntry> = {}
): AwsServiceMatrixEntry {
  return {
    id,
    name: id,
    category: 'compute',
    signalType: 'logs',
    deploymentMethods: [],
    showInUI: true,
    defaultEnabled: true,
    packageName: 'aws',
    ...overrides,
  } as AwsServiceMatrixEntry;
}

function makeTextVarDef(name: string): ServiceVarDef {
  return {
    def: { name, type: 'text', required: true, show_user: true } as any,
    inputs: ['aws-s3'],
  };
}

// --- incompleteInstances ---

describe('useServiceSettings — incompleteInstances', () => {
  const svcWithRequired = makeEntry('svc_a', {
    signalType: 'logs',
    inputs: ['aws-s3'],
    requiredConfig: ['bucket_arn'],
    varDefs: { bucket_arn: makeTextVarDef('bucket_arn') },
  });

  beforeEach(() => {
    mockUseSessionStorage.mockImplementation((_key: string, initial: unknown) => useState(initial));
    mockUseOnboardingFlow.mockReturnValue({
      servicesStep: { selectedServiceIds: ['svc_a'] },
      removeDeployInstance: jest.fn(),
      awsServicesMap: new Map([['svc_a', svcWithRequired]]),
    } as unknown as ReturnType<typeof useOnboardingFlow>);
  });

  it('marks instance incomplete when required text var is empty', () => {
    const { result } = renderHook(() => useServiceSettings({ onContinue: jest.fn() }));
    expect(result.current.incompleteInstances.map((i) => i.instanceId)).toContain('svc_a');
  });

  it('isReady is false when required var is empty even with region set', () => {
    const { result } = renderHook(() => useServiceSettings({ onContinue: jest.fn() }));
    act(() => result.current.setGlobalRegion('us-east-1'));
    expect(result.current.isReady).toBe(false);
  });

  it('instance leaves incompleteInstances after required var is filled', () => {
    const { result } = renderHook(() => useServiceSettings({ onContinue: jest.fn() }));
    act(() => result.current.setGlobalRegion('us-east-1'));
    act(() =>
      result.current.setServiceFieldsAndInputs(
        'svc_a',
        { bucket_arn: 'arn:aws:s3:::my-bucket' },
        ['aws-s3']
      )
    );
    expect(result.current.incompleteInstances).toHaveLength(0);
    expect(result.current.isReady).toBe(true);
  });

  it('duplicate instance also appears in incompleteInstances when its required var is empty', () => {
    const { result } = renderHook(() => useServiceSettings({ onContinue: jest.fn() }));
    act(() => result.current.addDuplicate('svc_a', 'svc_a [Duplicate]', {}, []));
    expect(result.current.incompleteInstances.length).toBeGreaterThanOrEqual(2);
    expect(result.current.incompleteInstanceIds.has('svc_a__dup-1')).toBe(true);
  });
});

// --- signal filter ---

describe('useServiceSettings — signal filter', () => {
  const svcLogs = makeEntry('svc_logs', { signalType: 'logs', inputs: [] });
  const svcMetrics = makeEntry('svc_metrics', { signalType: 'metrics', inputs: [] });

  beforeEach(() => {
    mockUseSessionStorage.mockImplementation((_key: string, initial: unknown) => useState(initial));
    mockUseOnboardingFlow.mockReturnValue({
      servicesStep: { selectedServiceIds: ['svc_logs', 'svc_metrics'] },
      removeDeployInstance: jest.fn(),
      awsServicesMap: new Map([
        ['svc_logs', svcLogs],
        ['svc_metrics', svcMetrics],
      ]),
    } as unknown as ReturnType<typeof useOnboardingFlow>);
  });

  it('shows all instances when filter is all', () => {
    const { result } = renderHook(() => useServiceSettings({ onContinue: jest.fn() }));
    expect(result.current.filteredInstances).toHaveLength(2);
  });

  it('narrows to metrics instance when signal filter is metrics', () => {
    const { result } = renderHook(() => useServiceSettings({ onContinue: jest.fn() }));
    act(() => result.current.setSignalFilter('metrics'));
    expect(result.current.filteredInstances).toHaveLength(1);
    expect(result.current.filteredInstances[0].instanceId).toBe('svc_metrics');
  });

  it('narrows to logs instance when signal filter is logs', () => {
    const { result } = renderHook(() => useServiceSettings({ onContinue: jest.fn() }));
    act(() => result.current.setSignalFilter('logs'));
    expect(result.current.filteredInstances).toHaveLength(1);
    expect(result.current.filteredInstances[0].instanceId).toBe('svc_logs');
  });
});

// --- instanceId generation (existing) ---

describe('useServiceSettings — addDuplicate instanceId generation', () => {
  it('assigns __dup-1 for the first duplicate', () => {
    const { result } = renderHook(() => useServiceSettings({ onContinue: jest.fn() }));

    act(() => {
      result.current.addDuplicate('guardduty', 'AWS GuardDuty [Duplicate]', {}, []);
    });

    const ids = result.current.instances.map((i) => i.instanceId);
    expect(ids).toContain('guardduty__dup-1');
  });

  it('assigns __dup-2 for the second duplicate', () => {
    const { result } = renderHook(() => useServiceSettings({ onContinue: jest.fn() }));

    act(() => {
      result.current.addDuplicate('guardduty', 'AWS GuardDuty [Duplicate]', {}, []);
    });
    act(() => {
      result.current.addDuplicate('guardduty', 'AWS GuardDuty [Duplicate 2]', {}, []);
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
      result.current.addDuplicate('guardduty', 'AWS GuardDuty [Duplicate]', {}, []);
    });
    act(() => {
      result.current.addDuplicate('guardduty', 'AWS GuardDuty [Duplicate 2]', {}, []);
    });
    act(() => {
      result.current.removeInstance('guardduty__dup-1');
    });
    act(() => {
      result.current.addDuplicate('guardduty', 'AWS GuardDuty [Duplicate 3]', {}, []);
    });

    const ids = result.current.instances.map((i) => i.instanceId);
    expect(ids).not.toContain('guardduty__dup-1'); // removed
    expect(ids).toContain('guardduty__dup-2'); // still present
    expect(ids).toContain('guardduty__dup-3'); // new — not a collision
    expect(new Set(ids).size).toBe(ids.length); // all unique
  });
});
