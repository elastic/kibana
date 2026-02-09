/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { assertNever } from '@elastic/eui';
import { useMemo } from 'react';

import type { CaseUserActionsStats } from '../../containers/types';
import type { UserActivityParams } from '../user_actions_activity_bar/types';

export const useLastPage = ({
  userActivityQueryParams,
  userActionsStats,
}: {
  userActivityQueryParams: UserActivityParams;
  userActionsStats: CaseUserActionsStats;
}) => {
  const lastPage = useMemo(() => {
    if (!userActionsStats) {
      return 1;
    }

    const perPage = userActivityQueryParams.perPage;
    let lastPageType = 1;

    switch (userActivityQueryParams.type) {
      case 'action':
        lastPageType = Math.ceil(userActionsStats.totalOtherActions / perPage);
        break;
      case 'user':
        lastPageType = Math.ceil(userActionsStats.totalCommentCreations / perPage || 1);
        break;
      case 'all':
        lastPageType = Math.ceil(userActionsStats.total / perPage);
        break;
      default:
        return assertNever(userActivityQueryParams.type);
    }

    return Math.max(lastPageType, 1);
  }, [userActionsStats, userActivityQueryParams]);

  return { lastPage };
};
