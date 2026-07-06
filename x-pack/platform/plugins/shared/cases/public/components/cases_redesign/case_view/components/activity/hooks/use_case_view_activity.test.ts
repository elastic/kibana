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
import { basicCase, getCaseUsersMockResponse } from '../../../../../../containers/mock';
import { TestProviders } from '../../../../../../common/mock';
import { useGetCaseConfiguration } from '../../../../../../containers/configure/use_get_case_configuration';
import { useGetCaseUsers } from '../../../../../../containers/use_get_case_users';
import { useGetCaseConnectors } from '../../../../../../containers/use_get_case_connectors';
import { useGetCurrentUserProfile } from '../../../../../../containers/user_profiles/use_get_current_user_profile';
import { useGetCaseUserActionsStats } from '../../../../../../containers/use_get_case_user_actions_stats';
import { useOnUpdateField } from '../../../../../case_view/use_on_update_field';
import { useStatusAction } from '../../../../../actions/status/use_status_action';
import type { CaseUI } from '../../../../../../../common';

jest.mock('../../../../../../common/navigation/hooks');
jest.mock('../../../../../../containers/configure/use_get_case_configuration');
jest.mock('../../../../../../containers/use_get_case_users');
jest.mock('../../../../../../containers/use_get_case_connectors');
jest.mock('../../../../../../containers/use_get_case_user_actions_stats');
jest.mock('../../../../../../containers/user_profiles/use_get_current_user_profile');
jest.mock('../../../../../case_view/use_on_update_field');
jest.mock('../../../../../case_view/use_on_refresh_case_view_page');
jest.mock('../../../../../actions/status/use_status_action');

const onUpdateField = jest.fn();
const handleUpdateCaseStatus = jest.fn();

const useGetCaseConfigurationMock = useGetCaseConfiguration as jest.Mock;
const useGetCaseUsersMock = useGetCaseUsers as jest.Mock;
const useGetCaseConnectorsMock = useGetCaseConnectors as jest.Mock;
const useGetCurrentUserProfileMock = useGetCurrentUserProfile as jest.Mock;
const useGetCaseUserActionsStatsMock = useGetCaseUserActionsStats as jest.Mock;
const useOnUpdateFieldMock = useOnUpdateField as jest.Mock;
const useStatusActionMock = useStatusAction as jest.Mock;

const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(TestProviders, null, children);

const caseData: CaseUI = basicCase;

describe('useCaseViewActivity', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useGetCaseConfigurationMock.mockReturnValue({ data: { customFields: [] } });
    useGetCaseUsersMock.mockReturnValue({ isLoading: false, data: getCaseUsersMockResponse() });
    useGetCaseConnectorsMock.mockReturnValue({ isLoading: false, data: {} });
    useGetCurrentUserProfileMock.mockReturnValue({ data: {} });
    useGetCaseUserActionsStatsMock.mockReturnValue({ isLoading: false, data: {} });
    useOnUpdateFieldMock.mockReturnValue({ onUpdateField, isLoading: false, loadingKey: null });
    useStatusActionMock.mockReturnValue({
      isUpdatingStatus: false,
      handleUpdateCaseStatus,
    });
  });

  it('updates the field directly when changing to a non-closed status', () => {
    const { result } = renderHook(() => useCaseViewActivity({ caseData }), { wrapper });

    act(() => {
      result.current.changeStatus(CaseStatuses.open);
    });

    expect(onUpdateField).toHaveBeenCalledWith({ key: 'status', value: CaseStatuses.open });
    expect(handleUpdateCaseStatus).not.toHaveBeenCalled();
  });

  it('delegates to the status action flow when closing a case', () => {
    const { result } = renderHook(() => useCaseViewActivity({ caseData }), { wrapper });

    act(() => {
      result.current.changeStatus(CaseStatuses.closed, 'because reasons');
    });

    expect(onUpdateField).not.toHaveBeenCalled();
    expect(handleUpdateCaseStatus).toHaveBeenCalledWith(
      [caseData],
      CaseStatuses.closed,
      'because reasons'
    );
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
});
