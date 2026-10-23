/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';

jest.mock('../../onboarding_flow_context', () => ({
  useOnboardingFlow: jest.fn(),
}));

import { useOnboardingFlow } from '../../onboarding_flow_context';
import { useServicesStep } from './use_services_step';
import type { AwsServiceMatrixEntry } from '../../aws_service_matrix';

const mockUseOnboardingFlow = useOnboardingFlow as jest.Mock;

const MINIMAL_ENTRY = {
  deploymentMethods: [{ method: 'ecf', preferred: true }],
  showInUI: true,
  isManifestLoaded: true,
  isManifestError: false,
  isStaticAgentBasedOnly: false,
  defaultEnabled: true,
  defaultEnabledInputs: [],
  dataStreams: [],
  packageName: 'aws',
};

describe('useServicesStep — flat service list', () => {
  const FLAT_MATRIX: AwsServiceMatrixEntry[] = [
    { ...MINIMAL_ENTRY, id: 'svc_ec2', name: 'Amazon EC2', signalTypes: ['logs'] },
    { ...MINIMAL_ENTRY, id: 'svc_dynamodb', name: 'Amazon DynamoDB', signalTypes: ['metrics'] },
    { ...MINIMAL_ENTRY, id: 'svc_cloudtrail', name: 'AWS CloudTrail', signalTypes: ['logs'] },
    { ...MINIMAL_ENTRY, id: 'svc_firewall_logs', name: 'AWS Firewall', signalTypes: ['logs'] },
    {
      ...MINIMAL_ENTRY,
      id: 'svc_firewall_metrics',
      name: 'AWS Firewall',
      signalTypes: ['metrics'],
    },
    { ...MINIMAL_ENTRY, id: 'svc_hidden', name: 'Hidden', signalTypes: ['logs'], showInUI: false },
  ] as AwsServiceMatrixEntry[];

  let selectedIds: string[];
  let setSelectedServiceIds: jest.Mock;

  beforeEach(() => {
    selectedIds = [];
    setSelectedServiceIds = jest.fn();
    mockUseOnboardingFlow.mockImplementation(() => ({
      servicesStep: { selectedServiceIds: selectedIds, dataFormat: 'ecs' as const },
      setSelectedServiceIds,
      setDataFormat: jest.fn(),
      awsServiceMatrix: FLAT_MATRIX,
    }));
  });

  it('lists every visible service in one list, sorted by name', () => {
    const { result } = renderHook(() => useServicesStep({ onContinue: jest.fn() }));
    expect(result.current.filteredServices.map((s) => s.id)).toEqual([
      'svc_dynamodb',
      'svc_ec2',
      'svc_cloudtrail',
      'svc_firewall_logs',
      'svc_firewall_metrics',
    ]);
  });

  it('applies the signal filter and the search query to the one list', () => {
    const { result } = renderHook(() => useServicesStep({ onContinue: jest.fn() }));

    act(() => result.current.setSignalFilter('metrics'));
    expect(result.current.filteredServices.map((s) => s.id)).toEqual([
      'svc_dynamodb',
      'svc_firewall_metrics',
    ]);

    act(() => result.current.setSearchQuery('dynamo'));
    expect(result.current.filteredServices.map((s) => s.id)).toEqual(['svc_dynamodb']);
  });

  it('flags names shared by several services as duplicates', () => {
    const { result } = renderHook(() => useServicesStep({ onContinue: jest.fn() }));
    expect([...result.current.duplicateNames]).toEqual(['AWS Firewall']);
  });

  it('select all adds every visible service to the selection', () => {
    selectedIds = ['svc_hidden'];
    const { result } = renderHook(() => useServicesStep({ onContinue: jest.fn() }));

    act(() => result.current.setSignalFilter('logs'));
    act(() => result.current.handleSelectAllVisible());

    expect(setSelectedServiceIds).toHaveBeenCalledWith([
      'svc_hidden',
      'svc_ec2',
      'svc_cloudtrail',
      'svc_firewall_logs',
    ]);
  });

  it('deselect all only removes the visible services from the selection', () => {
    selectedIds = ['svc_ec2', 'svc_dynamodb'];
    const { result } = renderHook(() => useServicesStep({ onContinue: jest.fn() }));

    act(() => result.current.setSignalFilter('logs'));
    expect(result.current.allVisibleSelected).toBe(false);
    act(() => result.current.handleDeselectAllVisible());

    expect(setSelectedServiceIds).toHaveBeenCalledWith(['svc_dynamodb']);
  });

  it('allVisibleSelected is true once every visible service is selected', () => {
    selectedIds = ['svc_ec2', 'svc_cloudtrail', 'svc_firewall_logs'];
    const { result } = renderHook(() => useServicesStep({ onContinue: jest.fn() }));

    act(() => result.current.setSignalFilter('logs'));
    expect(result.current.allVisibleSelected).toBe(true);
  });
});
