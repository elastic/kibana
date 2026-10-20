/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';

import type { AttachmentUIV2, UserActionUI } from '../../containers/types';
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
  const isLastPageQueryEnabled = lastPage > 1;
  const { data: lastPageUserActionsData, isLoading: isLoadingLastPageUserActionsQuery } =
    useFindCaseUserActions(
      caseId,
      { ...userActivityQueryParams, page: lastPage },
      isLastPageQueryEnabled
    );

  // react-query v4's `isLoading` reflects the data status, not whether a
  // fetch is actually happening: a disabled query with no data is reported
  // as `isLoading: true` forever. When there's no separate last page to
  // fetch (search/author filters collapse everything into a single infinite
  // query, see `useLastPage`), this query is intentionally disabled and
  // should never be treated as loading, otherwise the skeleton (and the
  // "no results" state below it) never resolves.
  const isLoadingLastPageUserActions = isLastPageQueryEnabled && isLoadingLastPageUserActionsQuery;

  const { userActions, latestAttachments } = useMemo<{
    userActions: UserActionUI[];
    latestAttachments: AttachmentUIV2[];
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
