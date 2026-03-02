/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import { ProjectRoutingAccess } from '@kbn/cps-utils';
import { useRouteMatch } from 'react-router-dom';
import { useKibana } from '../../common/lib';
import { useRegisterCpsPickerAccess } from './use_register_cps_picker_access';
import { BehaviorSubject } from 'rxjs';

jest.mock('react-router-dom', () => ({
  useRouteMatch: jest.fn(),
}));
jest.mock('../../common/lib');

const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;
const mockUseRouteMatch = jest.mocked(useRouteMatch);
const mockCurrentAppId$ = new BehaviorSubject('app-id');

describe('useRegisterCpsPickerAccess', () => {
  const registerAppAccess = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRouteMatch.mockReturnValue({ url: '/app/alerts/rule/123' } as any);
    mockUseKibana.mockReturnValue({
      services: {
        application: {
          currentAppId$: mockCurrentAppId$,
        },
        cps: {
          cpsManager: {
            registerAppAccess,
          },
        },
      },
    } as any);
  });

  const getRegisteredCallback = () =>
    registerAppAccess.mock.calls[registerAppAccess.mock.calls.length - 1]?.[1];

  it('registers access for the current app and matches the route', () => {
    renderHook(() => useRegisterCpsPickerAccess());

    expect(registerAppAccess).toHaveBeenCalledTimes(1);
    expect(registerAppAccess).toHaveBeenCalledWith('app-id', expect.any(Function));

    const callback = getRegisteredCallback();
    expect(callback?.('/app/alerts/rule/123')).toBe(ProjectRoutingAccess.DISABLED);
    expect(callback?.('/app/alerts/rule/999')).toBe(ProjectRoutingAccess.DISABLED);
  });

  it('updates the access value when setAccess is called', () => {
    const { result } = renderHook(() => useRegisterCpsPickerAccess());

    act(() => {
      result.current(ProjectRoutingAccess.READONLY);
    });

    expect(registerAppAccess).toHaveBeenCalledTimes(3);
    const callback = getRegisteredCallback();
    expect(callback?.('/app/alerts/rule/123')).toBe(ProjectRoutingAccess.READONLY);
    expect(callback?.('/app/alerts/rule/999')).toBe(ProjectRoutingAccess.DISABLED);
  });

  it('resets access to disabled on unmount', () => {
    const { unmount } = renderHook(() => useRegisterCpsPickerAccess());

    unmount();

    expect(registerAppAccess).toHaveBeenCalledTimes(2);
    const callback = getRegisteredCallback();
    expect(callback?.('/app/alerts/rule/123')).toBe(ProjectRoutingAccess.DISABLED);
  });

  it('does not register when currentAppId is missing', () => {
    // @ts-expect-error invalid app value
    mockCurrentAppId$.next(undefined);

    renderHook(() => useRegisterCpsPickerAccess());

    expect(registerAppAccess).not.toHaveBeenCalled();
  });

  it('does not register when cpsManager is missing', () => {
    mockUseKibana.mockReturnValue({
      services: {
        application: {
          currentAppId$: mockCurrentAppId$,
        },
        cps: {},
      },
    } as any);

    renderHook(() => useRegisterCpsPickerAccess());

    expect(registerAppAccess).not.toHaveBeenCalled();
  });
});
