/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InfiniteData, QueryClient } from '@kbn/react-query';
import { changeHistoryListQueryKey } from '../hooks/change_history_list_query_key';
import type { ChangeHistoryScope } from '../types/change_history_scope';
import type { ListChangeHistoryResult } from '../types/list_change_history_params';
import { DEFAULT_CHANGE_HISTORY_PAGE_SIZE } from '../types/change_history_constants';
import { findCurrentChangeHistoryListItem } from './build_change_history_restore_telemetry';
import { getRestoreVersionLabel } from './get_restore_version_label';

export const getChangeHistoryNewSequenceAfterRestore = ({
  queryClient,
  objectId,
  scope,
  pageSize = DEFAULT_CHANGE_HISTORY_PAGE_SIZE,
}: {
  queryClient: QueryClient;
  objectId: string;
  scope: ChangeHistoryScope;
  pageSize?: number;
}): number | undefined => {
  const listData = queryClient.getQueryData<InfiniteData<ListChangeHistoryResult>>(
    changeHistoryListQueryKey({ objectId, scope, pageSize })
  );

  if (!listData?.pages.length) {
    return undefined;
  }

  const items = listData.pages.flatMap((page) => page.items);
  const currentChange = findCurrentChangeHistoryListItem(items);

  return currentChange ? getRestoreVersionLabel(currentChange) : undefined;
};
