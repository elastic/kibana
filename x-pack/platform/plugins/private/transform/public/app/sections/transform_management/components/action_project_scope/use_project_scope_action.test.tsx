/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import { PROJECT_ROUTING, useFetchProjects } from '@kbn/cps-utils';

import type { TransformListRow } from '../../../../common';
import * as appDependencies from '../../../../app_dependencies';
import { useTransformCapabilities, useUpdateTransformsProjectScope } from '../../../../hooks';
import { useProjectScopeAction } from './use_project_scope_action';

const mockUseGetTransformCpsEnabled = jest.fn(
  (_args?: { enabled: boolean }) => ({ data: true } as { data: boolean | undefined })
);

jest.mock('../../../../app_dependencies');

jest.mock('../../../../hooks', () => ({
  useTransformCapabilities: jest.fn(),
  useUpdateTransformsProjectScope: jest.fn(),
}));

jest.mock('../../../../hooks/use_get_transform_cps_enabled', () => ({
  useGetTransformCpsEnabled: (args: { enabled: boolean }) => mockUseGetTransformCpsEnabled(args),
}));

jest.mock('@kbn/cps-utils', () => {
  const actual = jest.requireActual('@kbn/cps-utils');
  return {
    ...actual,
    useFetchProjects: jest.fn(),
  };
});

const mockUseFetchProjects = useFetchProjects as jest.MockedFunction<typeof useFetchProjects>;
const mockUseTransformCapabilities = useTransformCapabilities as jest.MockedFunction<
  typeof useTransformCapabilities
>;
const mockUseUpdateTransformsProjectScope = useUpdateTransformsProjectScope as jest.MockedFunction<
  typeof useUpdateTransformsProjectScope
>;

const createTransformItem = (id: string) =>
  ({
    id,
    config: {
      id,
      source: { index: ['source-index'], project_routing: PROJECT_ROUTING.ORIGIN },
      dest: { index: 'dest-index' },
    },
  } as unknown as TransformListRow);

const transformItem = createTransformItem('transform-1');
const secondTransformItem = createTransformItem('transform-2');

describe('Transform: Transform List Actions <useProjectScopeAction />', () => {
  const updateTransformsProjectScope = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseGetTransformCpsEnabled.mockReturnValue({ data: true });
    appDependencies.useAppDependencies().cps = {
      isTierEligible: true,
      cpsManager: {
        fetchProjects: jest.fn(),
        getDefaultProjectRouting: jest.fn(() => PROJECT_ROUTING.ALL),
      },
    } as any;
    mockUseFetchProjects.mockReturnValue({
      error: null,
      isLoading: false,
      linkedProjects: [
        {
          _id: 'linked-project',
          _alias: 'linked_project',
          _organisation: 'org',
          _type: 'security',
        },
      ],
      originProject: {
        _id: 'origin-project',
        _alias: 'origin_project',
        _organisation: 'org',
        _type: 'security',
      },
    });
    mockUseTransformCapabilities.mockReturnValue({ canCreateTransform: true } as ReturnType<
      typeof useTransformCapabilities
    >);
    mockUseUpdateTransformsProjectScope.mockReturnValue(updateTransformsProjectScope);
  });

  it('disables the action when the Elasticsearch cross-project feature flags are disabled', () => {
    mockUseGetTransformCpsEnabled.mockReturnValue({ data: false });
    const { result } = renderHook(() => useProjectScopeAction());

    expect(result.current.isCpsEnabled).toBe(false);
    expect(result.current.isDisabled([transformItem])).toBe(true);

    act(() => {
      result.current.openFlyout([transformItem]);
    });

    expect(result.current.isFlyoutVisible).toBe(false);
  });

  it('calls the success callback and clears action items when all updates succeed', () => {
    const onUpdateSuccess = jest.fn();
    const { result } = renderHook(() => useProjectScopeAction({ onUpdateSuccess }));

    act(() => {
      result.current.openFlyout([transformItem]);
    });
    act(() => {
      result.current.openModal(PROJECT_ROUTING.ALL);
    });
    act(() => {
      result.current.confirmAndCloseModal();
    });

    expect(updateTransformsProjectScope).toHaveBeenCalledWith(
      {
        projectRouting: PROJECT_ROUTING.ALL,
        transformsInfo: [{ id: transformItem.id }],
      },
      { onSuccess: expect.any(Function) }
    );

    act(() => {
      updateTransformsProjectScope.mock.calls[0][1].onSuccess({
        [transformItem.id]: { success: true },
      });
    });

    expect(onUpdateSuccess).toHaveBeenCalledWith([transformItem]);
    expect(result.current.items).toEqual([]);
  });

  it('keeps the selection callback untouched when any update fails', () => {
    const onUpdateSuccess = jest.fn();
    const { result } = renderHook(() => useProjectScopeAction({ onUpdateSuccess }));

    act(() => {
      result.current.openFlyout([transformItem, secondTransformItem]);
    });
    act(() => {
      result.current.openModal(PROJECT_ROUTING.ALL);
    });
    act(() => {
      result.current.confirmAndCloseModal();
    });

    act(() => {
      updateTransformsProjectScope.mock.calls[0][1].onSuccess({
        [transformItem.id]: { success: true },
        [secondTransformItem.id]: {
          error: { reason: 'Could not update transform' },
          success: false,
        },
      });
    });

    expect(onUpdateSuccess).not.toHaveBeenCalled();
    expect(result.current.items).toEqual([transformItem, secondTransformItem]);
  });

  it('does not clear a newer action selection when an earlier update succeeds', () => {
    const onUpdateSuccess = jest.fn();
    const { result } = renderHook(() => useProjectScopeAction({ onUpdateSuccess }));

    act(() => {
      result.current.openFlyout([transformItem]);
    });
    act(() => {
      result.current.openModal(PROJECT_ROUTING.ALL);
    });
    act(() => {
      result.current.confirmAndCloseModal();
    });
    act(() => {
      result.current.openFlyout([secondTransformItem]);
    });
    act(() => {
      updateTransformsProjectScope.mock.calls[0][1].onSuccess({
        [transformItem.id]: { success: true },
      });
    });

    expect(result.current.items).toEqual([secondTransformItem]);
    expect(onUpdateSuccess).toHaveBeenCalledWith([transformItem]);
  });
});
