/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState } from 'react';
import { CaseStatuses } from '@kbn/cases-components';
import type { CaseUI } from '../../../../../../../common';
import { useCasesLocalStorage } from '../../../../../../common/use_cases_local_storage';
import { useGetCaseConfiguration } from '../../../../../../containers/configure/use_get_case_configuration';
import { useGetCaseUsers } from '../../../../../../containers/use_get_case_users';
import { useGetCaseConnectors } from '../../../../../../containers/use_get_case_connectors';
import { useGetCurrentUserProfile } from '../../../../../../containers/user_profiles/use_get_current_user_profile';
import { useOnUpdateField } from '../../../../../case_view/use_on_update_field';
import { useCasesContext } from '../../../../../cases_context/use_cases_context';
import { useGetCaseUserActionsStats } from '../../../../../../containers/use_get_case_user_actions_stats';
import type {
  UserActivityFilters,
  UserActivityParams,
} from '../../../../../user_actions_activity_bar/types';
import { parseCaseUsers } from '../../../../../utils';
import { useStatusAction } from '../../../../../actions/status/use_status_action';
import { useRefreshCaseViewPage } from '../../../../../case_view/use_on_refresh_case_view_page';
import { LOCAL_STORAGE_KEYS } from '../../../../../../../common/constants';

export const useCaseViewActivity = ({ caseData }: { caseData: CaseUI }) => {
  const [persistedFilters, setPersistedFilters] = useCasesLocalStorage<UserActivityFilters>(
    LOCAL_STORAGE_KEYS.userActivityFilters,
    { type: 'all', sortOrder: 'asc' }
  );

  const [userActivityQueryParams, setUserActivityQueryParams] = useState<UserActivityParams>({
    ...persistedFilters,
    page: 1,
    perPage: 10,
  });

  const { permissions } = useCasesContext();

  const { data: caseConnectors, isLoading: isLoadingCaseConnectors } = useGetCaseConnectors(
    caseData.id
  );

  const { data: userActionsStats, isLoading: isLoadingUserActionsStats } =
    useGetCaseUserActionsStats(caseData.id);

  const { data: caseUsers, isLoading: isLoadingCaseUsers } = useGetCaseUsers(caseData.id);

  const { data: casesConfiguration } = useGetCaseConfiguration();

  const { userProfiles } = parseCaseUsers({
    caseUsers,
    createdBy: caseData.createdBy,
  });

  const { data: currentUserProfile } = useGetCurrentUserProfile();

  const { onUpdateField, isLoading, loadingKey } = useOnUpdateField({
    caseData,
  });
  const refreshCaseViewPage = useRefreshCaseViewPage();
  const statusAction = useStatusAction({
    isDisabled: false,
    onAction: () => {},
    onActionSuccess: refreshCaseViewPage,
    selectedStatus: caseData.status,
  });

  const changeStatus = useCallback(
    (status: CaseStatuses, closeReason?: string) => {
      if (status !== CaseStatuses.closed) {
        onUpdateField({
          key: 'status',
          value: status,
        });
      } else {
        statusAction.handleUpdateCaseStatus([caseData], status, closeReason);
      }
    },
    [caseData, onUpdateField, statusAction]
  );

  const handleUserActivityParamsChanged = useCallback(
    (params: UserActivityParams) => {
      setPersistedFilters({
        type: params.type,
        sortOrder: params.sortOrder,
        authors: params.authors,
      });
      setUserActivityQueryParams({ ...params, page: 1 });
    },
    [setPersistedFilters, setUserActivityQueryParams]
  );

  const isLoadingDescription = isLoading && loadingKey === 'description';
  const isStatusLoading = (isLoading && loadingKey === 'status') || statusAction.isUpdatingStatus;

  return {
    permissions,
    userActivityQueryParams,
    onUpdateField,
    isLoadingUserActionsStats,
    isLoadingCaseConnectors,
    isLoadingCaseUsers,
    caseConnectors,
    caseUsers,
    userActionsStats,
    userProfiles,
    currentUserProfile,
    casesConfiguration,
    isLoadingDescription,
    isStatusLoading,
    changeStatus,
    handleUserActivityParamsChanged,
  };
};
