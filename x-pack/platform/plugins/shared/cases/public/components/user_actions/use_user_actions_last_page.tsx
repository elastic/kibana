/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';

import type { AttachmentUI, UserActionUI } from '../../containers/types';
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

  const { userActions, latestAttachments } = useMemo<{
    userActions: UserActionUI[];
    latestAttachments: AttachmentUI[];
  }>(() => {
    if (isLoadingLastPageUserActions || !lastPageUserActionsData) {
      return { userActions: [], latestAttachments: [] };
    }

    return {
      userActions: lastPageUserActionsData.userActions,
      latestAttachments: lastPageUserActionsData.latestAttachments,
    };
  }, [lastPageUserActionsData, isLoadingLastPageUserActions]);

  return {
    isLoadingLastPageUserActions,
    lastPageUserActions: userActions,
    lastPageAttachments: latestAttachments,
  };
};
