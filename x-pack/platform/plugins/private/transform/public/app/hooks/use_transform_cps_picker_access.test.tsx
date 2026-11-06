/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { BehaviorSubject } from 'rxjs';
import { type ICPSManager, ProjectRoutingAccess } from '@kbn/cps-utils';
import { useAppDependencies } from '../app_dependencies';
import {
  getTransformCpsPickerAccess,
  useTransformCpsPickerAccess,
} from './use_transform_cps_picker_access';

jest.mock('../app_dependencies', () => ({
  useAppDependencies: jest.fn(),
}));

const mockUseAppDependencies = useAppDependencies as jest.Mock;

describe('getTransformCpsPickerAccess', () => {
  it('returns readonly access for create transform routes', () => {
    expect(
      getTransformCpsPickerAccess('/app/management/data/transform/create_transform/data-view-id')
    ).toBe(ProjectRoutingAccess.READONLY);
  });

  it('returns readonly access for create transform routes without a saved object id', () => {
    expect(getTransformCpsPickerAccess('/app/management/data/transform/create_transform')).toBe(
      ProjectRoutingAccess.READONLY
    );
  });

  it('returns disabled access for the transform list route', () => {
    expect(getTransformCpsPickerAccess('/app/management/data/transform')).toBe(
      ProjectRoutingAccess.DISABLED
    );
  });

  it('returns readonly access for clone transform routes', () => {
    expect(
      getTransformCpsPickerAccess('/app/management/data/transform/clone_transform/transform-id')
    ).toBe(ProjectRoutingAccess.READONLY);
  });

  it('matches transform route segments exactly', () => {
    expect(
      getTransformCpsPickerAccess(
        '/app/management/data/transform/clone_transform/create_transform?dataViewId=data-view-id'
      )
    ).toBe(ProjectRoutingAccess.READONLY);
    expect(
      getTransformCpsPickerAccess('/app/management/data/transform/unknown/create_transform')
    ).toBe(ProjectRoutingAccess.DISABLED);
  });

  it('does not treat transform ids named "transform" as the app route segment', () => {
    expect(
      getTransformCpsPickerAccess('/app/management/data/transform/clone_transform/transform')
    ).toBe(ProjectRoutingAccess.READONLY);
    expect(
      getTransformCpsPickerAccess('/app/management/data/transform/create_transform/transform')
    ).toBe(ProjectRoutingAccess.READONLY);
  });

  it('returns disabled access for unknown routes', () => {
    expect(getTransformCpsPickerAccess('/app/management/data/transform/unknown')).toBe(
      ProjectRoutingAccess.DISABLED
    );
  });
});

describe('useTransformCpsPickerAccess', () => {
  const currentAppId$ = new BehaviorSubject<string | undefined>('management');
  const registerAppAccess = jest.fn();
  const cpsManager = { registerAppAccess } as unknown as ICPSManager;

  beforeEach(() => {
    currentAppId$.next('management');
    registerAppAccess.mockClear();
    mockUseAppDependencies.mockReturnValue({
      application: { currentAppId$ },
      cps: { cpsManager },
    });
  });

  it('registers transform CPS picker access for the current app', () => {
    renderHook(() => useTransformCpsPickerAccess());

    expect(registerAppAccess).toHaveBeenCalledTimes(1);
    expect(registerAppAccess).toHaveBeenCalledWith('management', expect.any(Function));

    const resolver = registerAppAccess.mock.calls[0][1];
    expect(resolver('/app/management/data/transform/create_transform/data-view-id')).toBe(
      ProjectRoutingAccess.READONLY
    );
    expect(resolver('/app/management/data/transform')).toBe(ProjectRoutingAccess.DISABLED);
  });

  it('resets CPS picker access to disabled on unmount', () => {
    const { unmount } = renderHook(() => useTransformCpsPickerAccess());

    unmount();

    expect(registerAppAccess).toHaveBeenCalledTimes(2);
    const cleanupResolver = registerAppAccess.mock.calls[1][1];
    expect(cleanupResolver('/app/management/data/transform/create_transform/data-view-id')).toBe(
      ProjectRoutingAccess.DISABLED
    );
  });

  it('does not register access when CPS is unavailable', () => {
    mockUseAppDependencies.mockReturnValue({
      application: { currentAppId$ },
      cps: undefined,
    });

    renderHook(() => useTransformCpsPickerAccess());

    expect(registerAppAccess).not.toHaveBeenCalled();
  });
});
