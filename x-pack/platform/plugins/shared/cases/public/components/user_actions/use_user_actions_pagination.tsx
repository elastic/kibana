/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';

import { useInfiniteFindCaseUserActions } from '../../containers/use_infinite_find_case_user_actions';
import type { AttachmentUI, UserActionUI } from '../../containers/types';
import type { UserActivityParams } from '../user_actions_activity_bar/types';

interface UserActionsPagination {
  userActivityQueryParams: UserActivityParams;
  caseId: string;
  lastPage: number;
}

export const useUserActionsPagination = ({
  userActivityQueryParams,
  caseId,
  lastPage,
}: UserActionsPagination) => {
  const {
    data: caseInfiniteUserActionsData,
    isLoading: isLoadingInfiniteUserActions,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useInfiniteFindCaseUserActions(caseId, userActivityQueryParams, true);

  const showBottomList = lastPage > 1;

  const infiniteCaseUserActions = useMemo<{
    userActions: UserActionUI[];
    latestAttachments: AttachmentUI[];
  }>(() => {
    if (!caseInfiniteUserActionsData?.pages?.length || isLoadingInfiniteUserActions) {
      return { userActions: [], latestAttachments: [] };
    }

    const userActionsData: UserActionUI[] = [];
    const latestAttachments: AttachmentUI[] = [];

    // TODO: looks like it can be done in one loop
    caseInfiniteUserActionsData.pages.forEach((page) => userActionsData.push(...page.userActions));
    caseInfiniteUserActionsData.pages.forEach((page) =>
      latestAttachments.push(...page.latestAttachments)
    );

    return { userActions: userActionsData, latestAttachments };
  }, [caseInfiniteUserActionsData, isLoadingInfiniteUserActions]);

  return {
    lastPage,
    showBottomList,
    isLoadingInfiniteUserActions,
    infiniteCaseUserActions: infiniteCaseUserActions.userActions,
    infiniteLatestAttachments: infiniteCaseUserActions.latestAttachments,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  };
};
