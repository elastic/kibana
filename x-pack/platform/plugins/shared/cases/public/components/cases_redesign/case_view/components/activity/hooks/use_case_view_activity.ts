/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo, useState } from 'react';
import { CaseStatuses } from '@kbn/cases-components';
import type { CaseUI } from '../../../../../../../common';
import { useCasesLocalStorage } from '../../../../../../common/use_cases_local_storage';
import { useOnUpdateField } from '../../../../../case_view/use_on_update_field';
import type {
  UserActivityFilters,
  UserActivityParams,
} from '../../../../../user_actions_activity_bar/types';
import { useStatusAction } from '../../../../../actions/status/use_status_action';
import { useRefreshCaseViewPage } from '../../../../../case_view/use_on_refresh_case_view_page';
import { LOCAL_STORAGE_KEYS } from '../../../../../../../common/constants';

/**
 * Local-storage-backed activity filters/pagination, plus status and
 * description field-update orchestration. Other cases-level data (permissions,
 * connectors, case users, configuration, etc.) should be read from their own
 * hooks where they're actually needed instead of being funnelled through here.
 */
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

  return useMemo(
    () => ({
      userActivityQueryParams,
      onUpdateField,
      isLoadingDescription,
      isStatusLoading,
      changeStatus,
      handleUserActivityParamsChanged,
    }),
    [
      userActivityQueryParams,
      onUpdateField,
      isLoadingDescription,
      isStatusLoading,
      changeStatus,
      handleUserActivityParamsChanged,
    ]
  );
};
