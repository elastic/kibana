/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import React from 'react';
import { renderHook, act } from '@testing-library/react';

import { CaseStatuses } from '@kbn/cases-components/src/status/types';

import { useCloseCaseFlow } from './use_close_case_flow';
import { basicCase } from '../../../../../containers/mock';
import { TestProviders } from '../../../../../common/mock';
import { useStatusAction } from '../../../../actions/status/use_status_action';
import { useCloseCaseModal } from '../../../../all_cases/hooks/use_close_case_modal';
import { useCanSyncCloseReasonToAlerts } from '../../../../all_cases/hooks/use_can_sync_close_reason_to_alerts';

vi.mock('../../../../actions/status/use_status_action');
vi.mock('../../../../all_cases/hooks/use_close_case_modal');
vi.mock('../../../../all_cases/hooks/use_can_sync_close_reason_to_alerts');
vi.mock('../../../use_on_refresh_case_view_page');

const mockHandleUpdateCaseStatus = vi.fn();
const mockOpenCloseCaseModal = vi.fn();

const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(TestProviders, null, children);

describe('useCloseCaseFlow', () => {
  const onUpdateField = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useStatusAction as Mock).mockReturnValue({
      handleUpdateCaseStatus: mockHandleUpdateCaseStatus,
    });
    (useCloseCaseModal as Mock).mockReturnValue({
      openCloseCaseModal: mockOpenCloseCaseModal,
      closeCaseModal: null,
    });
    (useCanSyncCloseReasonToAlerts as Mock).mockReturnValue(false);
  });

  it('calls onUpdateField for non-closed statuses', () => {
    const { result } = renderHook(() => useCloseCaseFlow({ caseData: basicCase, onUpdateField }), {
      wrapper,
    });

    act(() => {
      result.current.onStatusChanged(CaseStatuses.open);
    });

    expect(onUpdateField).toHaveBeenCalledWith({ key: 'status', value: CaseStatuses.open });
    expect(mockOpenCloseCaseModal).not.toHaveBeenCalled();
  });

  it('calls onUpdateField for in-progress status', () => {
    const { result } = renderHook(() => useCloseCaseFlow({ caseData: basicCase, onUpdateField }), {
      wrapper,
    });

    act(() => {
      result.current.onStatusChanged(CaseStatuses['in-progress']);
    });

    expect(onUpdateField).toHaveBeenCalledWith({
      key: 'status',
      value: CaseStatuses['in-progress'],
    });
    expect(mockOpenCloseCaseModal).not.toHaveBeenCalled();
  });

  it('opens close case modal when status is closed', () => {
    const { result } = renderHook(() => useCloseCaseFlow({ caseData: basicCase, onUpdateField }), {
      wrapper,
    });

    act(() => {
      result.current.onStatusChanged(CaseStatuses.closed);
    });

    expect(onUpdateField).not.toHaveBeenCalled();
    expect(mockOpenCloseCaseModal).toHaveBeenCalled();
  });

  it('returns closeCaseModal from useCloseCaseModal', () => {
    const mockModal = 'mock-modal-element';
    (useCloseCaseModal as Mock).mockReturnValue({
      openCloseCaseModal: mockOpenCloseCaseModal,
      closeCaseModal: mockModal,
    });

    const { result } = renderHook(() => useCloseCaseFlow({ caseData: basicCase, onUpdateField }), {
      wrapper,
    });

    expect(result.current.closeCaseModal).toBe(mockModal);
  });

  it('passes canSyncCloseReasonToAlerts to useCloseCaseModal', () => {
    (useCanSyncCloseReasonToAlerts as Mock).mockReturnValue(true);

    renderHook(() => useCloseCaseFlow({ caseData: basicCase, onUpdateField }), { wrapper });

    expect(useCloseCaseModal).toHaveBeenCalledWith(
      expect.objectContaining({ canSyncCloseReasonToAlerts: true })
    );
  });

  it('configures useStatusAction with case status and refresh callback', () => {
    renderHook(() => useCloseCaseFlow({ caseData: basicCase, onUpdateField }), { wrapper });

    expect(useStatusAction).toHaveBeenCalledWith(
      expect.objectContaining({
        isDisabled: false,
        selectedStatus: basicCase.status,
      })
    );
  });
});
