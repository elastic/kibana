/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo, useState } from 'react';
import type { CaseUI } from '../../../../../../common';
import type { CaseStatusDefinition } from '../../../../../../common/types/domain';
import { CATEGORY_TO_STATUS } from '../../../../../../common/utils/statuses';
import { useCasesLocalStorage } from '../../../../../common/use_cases_local_storage';
import { useOnUpdateField } from '../../../use_on_update_field';
import type {
  UserActivityFilters,
  UserActivityParams,
} from '../../../../user_actions_activity_bar/types';
import { useStatusAction } from '../../../../actions/status/use_status_action';
import { useRefreshCaseViewPage } from '../../../use_on_refresh_case_view_page';
import { LOCAL_STORAGE_KEYS } from '../../../../../../common/constants';
import { getCaseStatusKey, useCaseStatuses } from '../../../../status/use_case_statuses';

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
    selectedStatusKey: getCaseStatusKey(caseData),
  });
  const { isCustomStatusesEnabled } = useCaseStatuses();

  const changeStatus = useCallback(
    (status: CaseStatusDefinition, closeReason?: string) => {
      // The single field patch only sends `status`; moving to a status also needs its key.
      if (status.category === 'done' || isCustomStatusesEnabled) {
        statusAction.handleUpdateCaseStatus([caseData], status, closeReason);
      } else {
        onUpdateField({
          key: 'status',
          value: CATEGORY_TO_STATUS[status.category],
        });
      }
    },
    [caseData, isCustomStatusesEnabled, onUpdateField, statusAction]
  );

  const handleUserActivityParamsChanged = useCallback(
    (params: UserActivityParams) => {
      setPersistedFilters({
        type: params.type,
        sortOrder: params.sortOrder,
        authors: params.authors,
        sources: params.sources,
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
