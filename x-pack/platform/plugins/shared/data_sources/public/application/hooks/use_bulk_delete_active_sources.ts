/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@kbn/react-query';
import type { KibanaServerError } from '@kbn/kibana-utils-plugin/common';
import { i18n } from '@kbn/i18n';
import { useKibana } from './use_kibana';
import { API_BASE_PATH } from '../../../common/constants';
import type { BulkDeleteTaskStatusResponse } from '../../../common/types';
import { queryKeys } from '../query_keys';
import {
  savePendingBulkDelete,
  getPendingDeleteTaskId,
  clearPendingBulkDelete,
} from '../utils/pending_delete_storage';

const POLL_INTERVAL_MS = 3000;

interface BulkDeleteResponse {
  taskId: string;
}

export const useBulkDeleteActiveSources = (onComplete?: () => void) => {
  const queryClient = useQueryClient();
  const {
    services: { http, notifications },
  } = useKibana();
  const toasts = notifications?.toasts;

  // Track whether we're actively polling
  const [activeTaskId, setActiveTaskId] = useState<string | null>(() => getPendingDeleteTaskId());

  // Poll the task status when there's an active task
  useQuery<BulkDeleteTaskStatusResponse>(
    queryKeys.dataSources.taskStatus(activeTaskId ?? ''),
    async () => {
      return await http.get<BulkDeleteTaskStatusResponse>(
        `${API_BASE_PATH}/_tasks/${activeTaskId}`
      );
    },
    {
      enabled: !!activeTaskId,
      refetchInterval: (data) => {
        if (data?.isDone) return false;
        return POLL_INTERVAL_MS;
      },
      onSuccess: (data) => {
        if (!data.isDone) return;

        // Task is done so cleaning up
        clearPendingBulkDelete();
        setActiveTaskId(null);

        // Invalidate the list cache to reflect true server state
        queryClient.invalidateQueries(queryKeys.dataSources.list());

        const { deletedCount, errors } = data;

        if (errors.length === 0) {
          toasts?.addSuccess({
            title: i18n.translate('xpack.dataSources.bulkDelete.successToast', {
              defaultMessage:
                'Successfully deleted {count} {count, plural, one {data source} other {data sources}}',
              values: { count: deletedCount },
            }),
          });
        } else if (deletedCount > 0) {
          toasts?.addWarning({
            title: i18n.translate('xpack.dataSources.bulkDelete.partialSuccessToast', {
              defaultMessage:
                'Deleted {deletedCount} {deletedCount, plural, one {data source} other {data sources}}, but {errorCount} failed',
              values: { deletedCount, errorCount: errors.length },
            }),
          });
        } else {
          toasts?.addDanger({
            title: i18n.translate('xpack.dataSources.bulkDelete.failureToast', {
              defaultMessage:
                'Failed to delete {count} {count, plural, one {data source} other {data sources}}',
              values: { count: errors.length },
            }),
          });
        }

        onComplete?.();
      },
      onError: () => {
        // If polling fails (e.g. task not found), clean up
        clearPendingBulkDelete();
        setActiveTaskId(null);
        queryClient.invalidateQueries(queryKeys.dataSources.list());
      },
    }
  );

  // The mutation that triggers the bulk delete
  const mutation = useMutation<BulkDeleteResponse, { body: KibanaServerError }, string[]>(
    async (ids: string[]) => {
      return await http.delete<BulkDeleteResponse>(API_BASE_PATH, {
        body: JSON.stringify({ ids }),
      });
    },
    {
      onMutate: (ids) => {
        // Persist IDs to sessionStorage so they stay hidden across navigation/refresh
        savePendingBulkDelete({ ids });

        // Immediately remove items from the cached list
        const idsToDelete = new Set(ids);
        queryClient.setQueryData<{ dataSources: Array<{ id: string }>; total: number }>(
          queryKeys.dataSources.list(),
          (old) => {
            if (!old) return old;
            const filtered = old.dataSources.filter((s) => !idsToDelete.has(s.id));
            return { ...old, dataSources: filtered, total: filtered.length };
          }
        );
      },
      onSuccess: (data) => {
        // Store the taskId and start polling
        savePendingBulkDelete({ taskId: data.taskId });
        setActiveTaskId(data.taskId);
      },
      onError: (error) => {
        // API call failed -- undo the optimistic update
        clearPendingBulkDelete();
        queryClient.invalidateQueries(queryKeys.dataSources.list());
        toasts?.addError(new Error(error.body?.message || 'Unknown error'), {
          title: i18n.translate('xpack.dataSources.bulkDelete.errorToast', {
            defaultMessage: 'Failed to schedule bulk delete',
          }),
          toastMessage: error.body?.message,
        });
      },
    }
  );

  const bulkDelete = useCallback(
    (ids: string[]) => {
      mutation.mutate(ids);
    },
    [mutation]
  );

  return {
    bulkDelete,
    isDeleting: mutation.isLoading || !!activeTaskId,
  };
};
