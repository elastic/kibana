/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import useSessionStorage from 'react-use/lib/useSessionStorage';

jest.mock('react-use/lib/useSessionStorage');
jest.mock('../../onboarding_flow_context', () => ({
  useOnboardingFlow: jest.fn(),
}));

import { useOnboardingFlow } from '../../onboarding_flow_context';
import type { AwsServiceMatrixEntry } from '../../aws_service_matrix';
import { useReconciledServiceSettings } from './use_reconciled_service_settings';

const mockUseOnboardingFlow = useOnboardingFlow as jest.MockedFunction<typeof useOnboardingFlow>;
const mockUseSessionStorage = useSessionStorage as jest.MockedFunction<typeof useSessionStorage>;

const makeService = (id: string) =>
  ({ id, name: `${id} name`, showInUI: true } as unknown as AwsServiceMatrixEntry);

const servicesMap = new Map([
  ['svc_a', makeService('svc_a')],
  ['svc_b', makeService('svc_b')],
]);

const baseA = { instanceId: 'svc_a', serviceId: 'svc_a', name: 'svc_a name', isDuplicate: false };
const baseB = { instanceId: 'svc_b', serviceId: 'svc_b', name: 'svc_b name', isDuplicate: false };
const dupA = { instanceId: 'svc_a__dup-1', serviceId: 'svc_a', name: 'Prod A', isDuplicate: true };

const mockState = ({
  stored,
  selectedServiceIds,
  awsServicesMap = servicesMap,
}: {
  stored: unknown;
  selectedServiceIds: string[];
  // null stands for a services map that has not loaded yet (undefined would take the default).
  awsServicesMap?: Map<string, AwsServiceMatrixEntry> | null;
}) => {
  mockUseSessionStorage.mockReturnValue([stored, jest.fn()] as any);
  mockUseOnboardingFlow.mockReturnValue({
    servicesStep: { selectedServiceIds },
    awsServicesMap: awsServicesMap ?? undefined,
  } as unknown as ReturnType<typeof useOnboardingFlow>);
};

describe('useReconciledServiceSettings', () => {
  it('builds base instances when nothing was stored for Step 2', () => {
    mockState({
      stored: { globalRegion: '', serviceVars: {} },
      selectedServiceIds: ['svc_a', 'svc_b'],
    });

    const { result } = renderHook(() => useReconciledServiceSettings());

    expect(result.current.instances).toEqual([baseA, baseB]);
  });

  it('falls back to the defaults when the stored value is null', () => {
    mockState({ stored: null, selectedServiceIds: ['svc_a'] });

    const { result } = renderHook(() => useReconciledServiceSettings());

    expect(result.current).toEqual({ globalRegion: '', serviceVars: {}, instances: [baseA] });
  });

  it('keeps stored duplicates and adds a base instance for a service selected since', () => {
    mockState({
      stored: { globalRegion: 'us-east-1', serviceVars: {}, instances: [baseA, dupA] },
      selectedServiceIds: ['svc_a', 'svc_b'],
    });

    const { result } = renderHook(() => useReconciledServiceSettings());

    expect(result.current.instances).toEqual([baseA, dupA, baseB]);
  });

  it('drops the instances of services deselected since', () => {
    mockState({
      stored: { globalRegion: '', serviceVars: {}, instances: [baseA, dupA, baseB] },
      selectedServiceIds: ['svc_b'],
    });

    const { result } = renderHook(() => useReconciledServiceSettings());

    expect(result.current.instances).toEqual([baseB]);
  });

  it('keeps stored instances while the services map is loading', () => {
    mockState({
      stored: { globalRegion: '', serviceVars: {}, instances: [baseA, dupA] },
      selectedServiceIds: ['svc_a', 'svc_b'],
      awsServicesMap: null,
    });

    const { result } = renderHook(() => useReconciledServiceSettings());

    expect(result.current.instances).toEqual([baseA, dupA]);
  });

  it('passes the other stored settings through unchanged', () => {
    const stored = {
      globalRegion: 'eu-west-1',
      integrationName: 'aws-1',
      serviceVars: { svc_a: { enabledDataStreams: ['logs'], varsByDataStream: {} } },
    };
    mockState({ stored, selectedServiceIds: ['svc_a'] });

    const { result } = renderHook(() => useReconciledServiceSettings());

    expect(result.current).toEqual({ ...stored, instances: [baseA] });
  });

  it('returns the same object across re-renders while nothing changes', () => {
    mockState({
      stored: { globalRegion: '', serviceVars: {} },
      selectedServiceIds: ['svc_a'],
    });

    const { result, rerender } = renderHook(() => useReconciledServiceSettings());
    const first = result.current;
    rerender();

    expect(result.current).toBe(first);
  });
});
