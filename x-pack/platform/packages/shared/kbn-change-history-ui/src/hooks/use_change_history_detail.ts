/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type { ChangeHistoryAdapter } from '../types/change_history_adapter';
import type { ChangeHistoryDetail } from '../types/change_history_detail';
import { useChangeHistoryConfig } from '../provider/use_change_history_config';
import { toChangeHistoryPendingDetail } from '../utils/merge_change_history_pending_change';
import { resolveChangeHistoryPendingChange } from '../utils/resolve_change_history_pending_change';
import { changeHistoryDetailQueryKey } from './change_history_list_query_key';

export interface UseChangeHistoryDetailArgs {
  adapter: ChangeHistoryAdapter;
  objectId: string;
  changeId?: string;
  enabled?: boolean;
}

export interface UseChangeHistoryDetailResult {
  change?: ChangeHistoryDetail;
  isLoading: boolean;
  error?: Error;
}

export const useChangeHistoryDetail = ({
  adapter,
  objectId,
  changeId,
  enabled = true,
}: UseChangeHistoryDetailArgs): UseChangeHistoryDetailResult => {
  const { scope, supports } = useChangeHistoryConfig();
  const pendingChange = resolveChangeHistoryPendingChange(adapter, supports.unsavedChanges);
  const isPendingSelection = Boolean(pendingChange && changeId === pendingChange.id);

  const { data, error, isLoading } = useQuery<ChangeHistoryDetail, Error>(
    changeHistoryDetailQueryKey({
      objectId,
      changeId: changeId ?? '__none__',
      scope,
    }),
    ({ signal }) => {
      if (!changeId) {
        throw new Error('changeId is required');
      }

      return adapter.getChange({ objectId, changeId, signal });
    },
    {
      enabled: enabled && Boolean(changeId) && Boolean(objectId) && !isPendingSelection,
      keepPreviousData: true,
    }
  );

  const change =
    pendingChange && isPendingSelection
      ? toChangeHistoryPendingDetail(pendingChange)
      : changeId
      ? data
      : undefined;

  return {
    change,
    isLoading: isPendingSelection ? false : isLoading,
    error: error ?? undefined,
  };
};
