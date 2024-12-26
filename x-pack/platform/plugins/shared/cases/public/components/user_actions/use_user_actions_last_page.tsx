/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';

import type { UserActionUI } from '../../containers/types';
import { useFindCaseUserActions } from '../../containers/use_find_case_user_actions';
import type { UserActivityParams } from '../user_actions_activity_bar/types';

interface LastPageUserActions {
  userActivityQueryParams: UserActivityParams;
  caseId: string;
  lastPage: number;
}

export const useLastPageUserActions = ({
  userActivityQueryParams,
  caseId,
  lastPage,
}: LastPageUserActions) => {
  const { data: lastPageUserActionsData, isLoading: isLoadingLastPageUserActions } =
    useFindCaseUserActions(caseId, { ...userActivityQueryParams, page: lastPage }, lastPage > 1);

  const lastPageUserActions = useMemo<UserActionUI[]>(() => {
    if (isLoadingLastPageUserActions || !lastPageUserActionsData) {
      return [];
    }

    return lastPageUserActionsData.userActions;
  }, [lastPageUserActionsData, isLoadingLastPageUserActions]);

  return {
    isLoadingLastPageUserActions,
    lastPageUserActions,
  };
};
