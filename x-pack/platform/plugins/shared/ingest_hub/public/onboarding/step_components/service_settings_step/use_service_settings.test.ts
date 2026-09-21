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
jest.mock('../../use_resolve_iac_blueprints', () => ({
  useResolveIacBlueprints: jest.fn(),
}));

import { useOnboardingFlow } from '../../onboarding_flow_context';
import { useResolveIacBlueprints } from '../../use_resolve_iac_blueprints';
import { useServiceSettings } from './use_service_settings';
import type { AwsServiceMatrixEntry } from '../../aws_service_matrix';
import { AWS_SERVICES_MAP } from '../../aws_service_matrix';
import type { RegistryVarsEntry } from '@kbn/fleet-plugin/common';

const mockUseOnboardingFlow = useOnboardingFlow as jest.MockedFunction<typeof useOnboardingFlow>;
const mockUseSessionStorage = useSessionStorage as jest.MockedFunction<typeof useSessionStorage>;
const mockUseResolveIacBlueprints = useResolveIacBlueprints as jest.MockedFunction<
  typeof useResolveIacBlueprints
>;

let mockResolveIacBlueprints: jest.Mock;

beforeEach(() => {
  mockUseSessionStorage.mockImplementation((_key, initial) => useState(initial));
  mockUseOnboardingFlow.mockReturnValue({
    servicesStep: { selectedServiceIds: ['guardduty'] },
    removeDeployInstance: jest.fn(),
    invalidateIacBlueprintCoverage: jest.fn(),
    awsServicesMap: AWS_SERVICES_MAP,
  } as unknown as ReturnType<typeof useOnboardingFlow>);
  mockResolveIacBlueprints = jest.fn();
  mockUseResolveIacBlueprints.mockReturnValue(mockResolveIacBlueprints);
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
    signalTypes: ['logs'],
    dataStreams: [],
    deploymentMethods: [],
    showInUI: true,
    defaultEnabled: true,
    defaultEnabledInputs: [],
    packageName: 'aws',
    ...overrides,
  } as AwsServiceMatrixEntry;
}

function makeTextVarDef(name: string): RegistryVarsEntry {
  return { name, type: 'text', required: true, show_user: true } as RegistryVarsEntry;
}

// --- incompleteInstances ---

describe('useServiceSettings — incompleteInstances', () => {
  const svcWithRequired = makeEntry('svc_a', {
    signalTypes: ['logs'],
    dataStreams: ['svc_a'],
    inputs: ['aws-s3'],
    defaultEnabledInputs: ['aws-s3'],
    requiredConfig: ['bucket_arn'],
    varDefsByInput: { 'aws-s3': { bucket_arn: makeTextVarDef('bucket_arn') } },
    varDefsByDataStream: {
      svc_a: {
        inputs: ['aws-s3'],
        defaultEnabledInputs: ['aws-s3'],
        varDefsByInput: { 'aws-s3': { bucket_arn: makeTextVarDef('bucket_arn') } },
        requiredConfig: ['bucket_arn'],
      },
    },
  });

  beforeEach(() => {
    mockUseSessionStorage.mockImplementation((_key: string, initial: unknown) => useState(initial));
    mockUseOnboardingFlow.mockReturnValue({
      servicesStep: { selectedServiceIds: ['svc_a'] },
      removeDeployInstance: jest.fn(),
      invalidateIacBlueprintCoverage: jest.fn(),
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
        {
          svc_a: {
            enabledInputs: ['aws-s3'],
            varsByInput: { 'aws-s3': { bucket_arn: 'arn:aws:s3:::my-bucket' } },
          },
        },
        ['svc_a']
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
  const svcLogs = makeEntry('svc_logs', { signalTypes: ['logs'], dataStreams: [] });
  const svcMetrics = makeEntry('svc_metrics', { signalTypes: ['metrics'], dataStreams: [] });

  beforeEach(() => {
    mockUseSessionStorage.mockImplementation((_key: string, initial: unknown) => useState(initial));
    mockUseOnboardingFlow.mockReturnValue({
      servicesStep: { selectedServiceIds: ['svc_logs', 'svc_metrics'] },
      removeDeployInstance: jest.fn(),
      invalidateIacBlueprintCoverage: jest.fn(),
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

describe('useServiceSettings — handleNext', () => {
  it('fires the IaC blueprint resolve with the persisted vars and continues', () => {
    const onContinue = jest.fn();
    const { result } = renderHook(() => useServiceSettings({ onContinue }));

    const vars = {
      enabledDataStreams: ['guardduty'],
      varsByDataStream: {},
    };
    act(() => {
      result.current.setServiceFieldsAndInputs('guardduty', {}, ['guardduty']);
    });
    act(() => {
      result.current.handleNext();
    });

    expect(mockResolveIacBlueprints).toHaveBeenCalledTimes(1);
    expect(mockResolveIacBlueprints).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ instanceId: 'guardduty', serviceId: 'guardduty' }),
      ]),
      expect.objectContaining({
        guardduty: expect.objectContaining({ enabledDataStreams: vars.enabledDataStreams }),
      })
    );
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it('continues even when no vars were persisted yet', () => {
    const onContinue = jest.fn();
    const { result } = renderHook(() => useServiceSettings({ onContinue }));

    act(() => {
      result.current.handleNext();
    });

    expect(mockResolveIacBlueprints).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ instanceId: 'guardduty', serviceId: 'guardduty' }),
      ]),
      {}
    );
    expect(onContinue).toHaveBeenCalledTimes(1);
  });
});

describe('useServiceSettings — blueprint coverage invalidation', () => {
  it('invalidates coverage when vars change and when an instance is removed', () => {
    const invalidateIacBlueprintCoverage = jest.fn();
    mockUseOnboardingFlow.mockReturnValue({
      servicesStep: { selectedServiceIds: ['guardduty'] },
      removeDeployInstance: jest.fn(),
      invalidateIacBlueprintCoverage,
      awsServicesMap: AWS_SERVICES_MAP,
    } as unknown as ReturnType<typeof useOnboardingFlow>);
    const { result } = renderHook(() => useServiceSettings({ onContinue: jest.fn() }));

    act(() => {
      result.current.setServiceFieldsAndInputs('guardduty', {}, ['guardduty']);
    });
    expect(invalidateIacBlueprintCoverage).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.addDuplicate('guardduty', 'AWS GuardDuty [Duplicate]', {}, []);
    });
    expect(invalidateIacBlueprintCoverage).toHaveBeenCalledTimes(2);

    act(() => {
      result.current.removeInstance('guardduty');
    });
    expect(invalidateIacBlueprintCoverage).toHaveBeenCalledTimes(3);
  });
});
