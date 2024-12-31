/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import { CaseStatuses } from '../../../../common/types/domain';
import { useUserPermissions } from '../../user_actions/use_user_permissions';
import { useShouldDisableStatus } from './use_should_disable_status';

jest.mock('../../user_actions/use_user_permissions');
const mockUseUserPermissions = useUserPermissions as jest.Mock;

describe('useShouldDisableStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should disable status when user has no permissions', () => {
    mockUseUserPermissions.mockReturnValue({
      canUpdate: false,
      canReopenCase: false,
    });

    const { result } = renderHook(() => useShouldDisableStatus());

    const cases = [{ status: CaseStatuses.open }];
    expect(result.current(cases)).toBe(true);
  });

  it('should allow status change when user has all permissions', () => {
    mockUseUserPermissions.mockReturnValue({
      canUpdate: true,
      canReopenCase: true,
    });

    const { result } = renderHook(() => useShouldDisableStatus());

    const cases = [{ status: CaseStatuses.open }];
    expect(result.current(cases)).toBe(false);
  });

  it('should only allow reopening when user can only reopen cases', () => {
    mockUseUserPermissions.mockReturnValue({
      canUpdate: false,
      canReopenCase: true,
    });

    const { result } = renderHook(() => useShouldDisableStatus());

    const cases = [{ status: CaseStatuses.closed }, { status: CaseStatuses.open }];

    expect(result.current(cases)).toBe(false);

    const closedCases = [{ status: CaseStatuses.closed }];
    expect(result.current(closedCases)).toBe(false);
  });

  it('should prevent reopening closed cases when user cannot reopen', () => {
    mockUseUserPermissions.mockReturnValue({
      canUpdate: true,
      canReopenCase: false,
    });

    const { result } = renderHook(() => useShouldDisableStatus());

    const closedCases = [{ status: CaseStatuses.closed }];
    expect(result.current(closedCases)).toBe(true);

    const openCases = [{ status: CaseStatuses.open }];
    expect(result.current(openCases)).toBe(false);
  });

  it('should handle multiple selected cases correctly', () => {
    mockUseUserPermissions.mockReturnValue({
      canUpdate: true,
      canReopenCase: false,
    });

    const { result } = renderHook(() => useShouldDisableStatus());

    const mixedCases = [{ status: CaseStatuses.open }, { status: CaseStatuses.closed }];

    expect(result.current(mixedCases)).toBe(true);
  });
});
