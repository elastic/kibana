/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { CaseStatuses } from '@kbn/cases-components';

import { useCaseViewActivity } from './use_case_view_activity';
import { basicCase } from '../../../../../containers/mock';
import { TestProviders } from '../../../../../common/mock';
import { useOnUpdateField } from '../../../use_on_update_field';
import { useStatusAction } from '../../../../actions/status/use_status_action';
import type { CaseUI } from '../../../../../../common';
import type { CaseStatusDefinition } from '../../../../../../common/types/domain';
import { DEFAULT_CASE_STATUSES } from '../../../../../../common/utils/statuses';
import * as customStatuses from '../../../../../common/custom_statuses';

jest.mock('../../../../../common/navigation/hooks');
jest.mock('../../../use_on_update_field');
jest.mock('../../../use_on_refresh_case_view_page');
jest.mock('../../../../actions/status/use_status_action');

const onUpdateField = jest.fn();
const handleUpdateCaseStatus = jest.fn();

const useOnUpdateFieldMock = useOnUpdateField as jest.Mock;
const useStatusActionMock = useStatusAction as jest.Mock;

const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(TestProviders, null, children);

const caseData: CaseUI = basicCase;
const [openStatus, , closedStatus] = DEFAULT_CASE_STATUSES;
const awaitingCustomer: CaseStatusDefinition = {
  key: 'awaiting_customer',
  label: 'Awaiting customer',
  color: 'accent',
  category: 'active',
  order: 3,
  isDefault: false,
  disabled: false,
};

describe('useCaseViewActivity', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useOnUpdateFieldMock.mockReturnValue({ onUpdateField, isLoading: false, loadingKey: null });
    useStatusActionMock.mockReturnValue({
      isUpdatingStatus: false,
      handleUpdateCaseStatus,
    });
  });

  it('updates the field directly when changing to a non-closed status', () => {
    const { result } = renderHook(() => useCaseViewActivity({ caseData }), { wrapper });

    act(() => {
      result.current.changeStatus(openStatus);
    });

    expect(onUpdateField).toHaveBeenCalledWith({ key: 'status', value: CaseStatuses.open });
    expect(handleUpdateCaseStatus).not.toHaveBeenCalled();
  });

  it('delegates to the status action flow when closing a case', () => {
    const { result } = renderHook(() => useCaseViewActivity({ caseData }), { wrapper });

    act(() => {
      result.current.changeStatus(closedStatus, 'because reasons');
    });

    expect(onUpdateField).not.toHaveBeenCalled();
    expect(handleUpdateCaseStatus).toHaveBeenCalledWith(
      [caseData],
      closedStatus,
      'because reasons'
    );
  });

  it('moves the case to the picked status when custom statuses are on', () => {
    const spy = jest.spyOn(customStatuses, 'isCustomStatusesEnabled').mockReturnValue(true);
    const { result } = renderHook(() => useCaseViewActivity({ caseData }), { wrapper });

    act(() => {
      result.current.changeStatus(awaitingCustomer);
    });

    expect(onUpdateField).not.toHaveBeenCalled();
    expect(handleUpdateCaseStatus).toHaveBeenCalledWith([caseData], awaitingCustomer, undefined);
    spy.mockRestore();
  });

  it('only reports the description as loading while it is the field being updated', () => {
    useOnUpdateFieldMock.mockReturnValue({
      onUpdateField,
      isLoading: true,
      loadingKey: 'description',
    });

    const { result } = renderHook(() => useCaseViewActivity({ caseData }), { wrapper });

    expect(result.current.isLoadingDescription).toBe(true);
    expect(result.current.isStatusLoading).toBe(false);
  });

  it('persists the filters and resets the page when the activity filters change', () => {
    const { result } = renderHook(() => useCaseViewActivity({ caseData }), { wrapper });

    act(() => {
      result.current.handleUserActivityParamsChanged({
        type: 'user',
        sortOrder: 'desc',
        page: 3,
        perPage: 10,
      });
    });

    expect(result.current.userActivityQueryParams).toEqual({
      type: 'user',
      sortOrder: 'desc',
      page: 1,
      perPage: 10,
    });
  });

  it('persists the authors filter when the activity filters change', () => {
    const { result } = renderHook(() => useCaseViewActivity({ caseData }), { wrapper });

    act(() => {
      result.current.handleUserActivityParamsChanged({
        type: 'all',
        sortOrder: 'asc',
        page: 1,
        perPage: 10,
        authors: ['elastic'],
      });
    });

    expect(result.current.userActivityQueryParams).toEqual({
      type: 'all',
      sortOrder: 'asc',
      page: 1,
      perPage: 10,
      authors: ['elastic'],
    });
  });

  it('persists the sources filter when the activity filters change', () => {
    const { result } = renderHook(() => useCaseViewActivity({ caseData }), { wrapper });

    act(() => {
      result.current.handleUserActivityParamsChanged({
        type: 'all',
        sortOrder: 'asc',
        page: 1,
        perPage: 10,
        sources: ['agent'],
      });
    });

    expect(result.current.userActivityQueryParams).toEqual({
      type: 'all',
      sortOrder: 'asc',
      page: 1,
      perPage: 10,
      sources: ['agent'],
    });
  });

  it('returns a memoized object reference across re-renders when nothing changes', () => {
    const { result, rerender } = renderHook(() => useCaseViewActivity({ caseData }), { wrapper });

    const firstResult = result.current;
    rerender();

    expect(result.current).toBe(firstResult);
  });
});
