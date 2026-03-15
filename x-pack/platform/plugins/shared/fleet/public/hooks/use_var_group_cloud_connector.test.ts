/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';

import type { RegistryVarGroup } from '../../common';

import { useVarGroupCloudConnector, type VarGroupSelection } from './use_var_group_cloud_connector';

describe('useVarGroupCloudConnector hook', () => {
  const mockUpdatePackagePolicy = jest.fn();

  const createMockPackagePolicy = (overrides?: Partial<{ inputs: any[] }>) => ({
    name: 'test-policy',
    enabled: true,
    policy_ids: [],
    inputs: overrides?.inputs ?? [],
  });

  const createMockVarGroups = (): RegistryVarGroup[] => [
    {
      name: 'auth_method',
      title: 'Authentication Method',
      selector_title: 'Select authentication method',
      options: [
        {
          name: 'cloud_connector',
          title: 'Cloud Connector',
          vars: ['role_arn', 'external_id', 'aws.account_type'],
          provider: 'aws',
          iac_template_url: 'https://example.com/cloudformation.yaml',
        },
        {
          name: 'manual',
          title: 'Manual',
          vars: ['access_key', 'secret_key'],
        },
      ],
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return isSelected: false when varGroups is undefined', () => {
    const selections: VarGroupSelection = { auth_method: 'cloud_connector' };

    const { result } = renderHook(() =>
      useVarGroupCloudConnector({
        varGroups: undefined,
        varGroupSelections: selections,
        packagePolicy: createMockPackagePolicy() as any,
        updatePackagePolicy: mockUpdatePackagePolicy,
      })
    );

    expect(result.current.isSelected).toBe(false);
    expect(result.current.cloudProvider).toBeUndefined();
    expect(result.current.accountType).toBe('single-account');
    expect(result.current.iacTemplateUrl).toBeUndefined();
    expect(result.current.cloudConnectorVars.size).toBe(0);
  });

  it('should return isSelected: false when no var_group selection is made', () => {
    const varGroups = createMockVarGroups();
    const selections: VarGroupSelection = {};

    const { result } = renderHook(() =>
      useVarGroupCloudConnector({
        varGroups,
        varGroupSelections: selections,
        packagePolicy: createMockPackagePolicy() as any,
        updatePackagePolicy: mockUpdatePackagePolicy,
      })
    );

    expect(result.current.isSelected).toBe(false);
    expect(result.current.cloudProvider).toBeUndefined();
    expect(result.current.cloudConnectorVars.size).toBe(0);
  });

  it('should return isSelected: false when non-cloud-connector option is selected', () => {
    const varGroups = createMockVarGroups();
    const selections: VarGroupSelection = { auth_method: 'manual' };

    const { result } = renderHook(() =>
      useVarGroupCloudConnector({
        varGroups,
        varGroupSelections: selections,
        packagePolicy: createMockPackagePolicy() as any,
        updatePackagePolicy: mockUpdatePackagePolicy,
      })
    );

    expect(result.current.isSelected).toBe(false);
    expect(result.current.cloudProvider).toBeUndefined();
    expect(result.current.cloudConnectorVars.size).toBe(0);
  });

  it('should return cloud connector info with default accountType when cloud connector option is selected', () => {
    const varGroups = createMockVarGroups();
    const selections: VarGroupSelection = { auth_method: 'cloud_connector' };

    const { result } = renderHook(() =>
      useVarGroupCloudConnector({
        varGroups,
        varGroupSelections: selections,
        packagePolicy: createMockPackagePolicy() as any,
        updatePackagePolicy: mockUpdatePackagePolicy,
      })
    );

    expect(result.current.isSelected).toBe(true);
    expect(result.current.cloudProvider).toBe('aws');
    expect(result.current.accountType).toBe('single-account');
    expect(result.current.iacTemplateUrl).toBe('https://example.com/cloudformation.yaml');
    expect(result.current.cloudConnectorVars).toEqual(
      new Set(['role_arn', 'external_id', 'aws.account_type'])
    );
  });

  it('should return accountType from enabled input vars', () => {
    const varGroups = createMockVarGroups();
    const selections: VarGroupSelection = { auth_method: 'cloud_connector' };
    const packagePolicy = createMockPackagePolicy({
      inputs: [
        {
          enabled: true,
          type: 'aws-test',
          vars: { 'aws.account_type': { value: 'organization-account' } },
        },
      ],
    });

    const { result } = renderHook(() =>
      useVarGroupCloudConnector({
        varGroups,
        varGroupSelections: selections,
        packagePolicy: packagePolicy as any,
        updatePackagePolicy: mockUpdatePackagePolicy,
      })
    );

    expect(result.current.accountType).toBe('organization-account');
  });

  it('should default accountType to single-account when input var is undefined', () => {
    const varGroups = createMockVarGroups();
    const selections: VarGroupSelection = { auth_method: 'cloud_connector' };
    const packagePolicy = createMockPackagePolicy({
      inputs: [
        {
          enabled: true,
          type: 'aws-test',
          vars: { 'aws.account_type': { value: undefined } },
        },
      ],
    });

    const { result } = renderHook(() =>
      useVarGroupCloudConnector({
        varGroups,
        varGroupSelections: selections,
        packagePolicy: packagePolicy as any,
        updatePackagePolicy: mockUpdatePackagePolicy,
      })
    );

    expect(result.current.accountType).toBe('single-account');
  });

  it('should read accountType from inputs when varGroups is undefined (legacy fallback)', () => {
    const selections: VarGroupSelection = {};
    const packagePolicy = createMockPackagePolicy({
      inputs: [
        {
          enabled: true,
          type: 'aws-test',
          vars: { 'aws.account_type': { value: 'organization-account' } },
        },
      ],
    });

    const { result } = renderHook(() =>
      useVarGroupCloudConnector({
        varGroups: undefined,
        varGroupSelections: selections,
        packagePolicy: packagePolicy as any,
        updatePackagePolicy: mockUpdatePackagePolicy,
      })
    );

    expect(result.current.accountType).toBe('single-account');
  });

  it('should default accountType when var_group scopes account_type but input has no value', () => {
    const varGroups = createMockVarGroups();
    const selections: VarGroupSelection = { auth_method: 'cloud_connector' };
    const packagePolicy = createMockPackagePolicy({
      inputs: [{ enabled: true, type: 'aws-test', vars: {} }],
    });

    const { result } = renderHook(() =>
      useVarGroupCloudConnector({
        varGroups,
        varGroupSelections: selections,
        packagePolicy: packagePolicy as any,
        updatePackagePolicy: mockUpdatePackagePolicy,
      })
    );

    expect(result.current.accountType).toBe('single-account');
  });

  it('should provide handleCloudConnectorUpdate callback that calls updatePackagePolicy', () => {
    const varGroups = createMockVarGroups();
    const selections: VarGroupSelection = { auth_method: 'cloud_connector' };

    const { result } = renderHook(() =>
      useVarGroupCloudConnector({
        varGroups,
        varGroupSelections: selections,
        packagePolicy: createMockPackagePolicy() as any,
        updatePackagePolicy: mockUpdatePackagePolicy,
      })
    );

    const updatedPolicy = { name: 'updated-policy', enabled: true, policy_ids: [], inputs: [] };
    act(() => {
      result.current.handleCloudConnectorUpdate({ updatedPolicy });
    });

    expect(mockUpdatePackagePolicy).toHaveBeenCalledWith(updatedPolicy);
  });

  it('should update when varGroupSelections change', () => {
    const varGroups = createMockVarGroups();
    let selections: VarGroupSelection = { auth_method: 'manual' };

    const { result, rerender } = renderHook(() =>
      useVarGroupCloudConnector({
        varGroups,
        varGroupSelections: selections,
        packagePolicy: createMockPackagePolicy() as any,
        updatePackagePolicy: mockUpdatePackagePolicy,
      })
    );

    expect(result.current.isSelected).toBe(false);

    // Change selection to cloud connector
    selections = { auth_method: 'cloud_connector' };
    rerender();

    expect(result.current.isSelected).toBe(true);
    expect(result.current.cloudProvider).toBe('aws');
  });

  it('should memoize values and not recreate on every render', () => {
    const varGroups = createMockVarGroups();
    const selections: VarGroupSelection = { auth_method: 'cloud_connector' };

    const { result, rerender } = renderHook(() =>
      useVarGroupCloudConnector({
        varGroups,
        varGroupSelections: selections,
        packagePolicy: createMockPackagePolicy() as any,
        updatePackagePolicy: mockUpdatePackagePolicy,
      })
    );

    const firstCloudConnectorVars = result.current.cloudConnectorVars;
    const firstHandleUpdate = result.current.handleCloudConnectorUpdate;

    // Rerender with same props
    rerender();

    // Memoized values should be the same reference
    expect(result.current.cloudConnectorVars).toBe(firstCloudConnectorVars);
    expect(result.current.handleCloudConnectorUpdate).toBe(firstHandleUpdate);
  });
});
