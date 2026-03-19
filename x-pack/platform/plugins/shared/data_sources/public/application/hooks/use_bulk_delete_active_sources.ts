/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@kbn/react-query';
import type { KibanaServerError } from '@kbn/kibana-utils-plugin/common';
import { i18n } from '@kbn/i18n';
import type { BulkDeleteDataSourcesResponse } from '../../../common';
import { useKibana } from './use_kibana';
import { BULK_DELETE_API_ROUTE } from '../../../common';
import { queryKeys } from '../query_keys';

export const useBulkDeleteActiveSources = (onSuccess?: () => void) => {
  const queryClient = useQueryClient();
  const {
    services: { http, notifications },
  } = useKibana();
  const toasts = notifications?.toasts;

  return useMutation(
    async (ids: string[]) => {
      return await http.post<BulkDeleteDataSourcesResponse>(BULK_DELETE_API_ROUTE, {
        body: JSON.stringify({ ids }),
      });
    },
    {
      onSuccess: (data) => {
        queryClient.invalidateQueries(queryKeys.dataSources.list());

        const fullyDeleted = data.results.filter((r) => r.success && r.fullyDeleted);
        const partiallyDeleted = data.results.filter((r) => r.success && !r.fullyDeleted);
        const failed = data.results.filter((r) => !r.success);

        if (failed.length === 0 && partiallyDeleted.length === 0) {
          toasts?.addSuccess({
            title: i18n.translate('xpack.dataSources.bulkDeleteActiveSources.successToast', {
              defaultMessage:
                '{count, plural, one {# data source} other {# data sources}} deleted successfully',
              values: { count: fullyDeleted.length },
            }),
          });
        } else if (failed.length === 0 && partiallyDeleted.length > 0) {
          toasts?.addWarning({
            title: i18n.translate('xpack.dataSources.bulkDeleteActiveSources.partialSuccessToast', {
              defaultMessage:
                '{deletedCount, plural, =0 {} one {# data source deleted successfully, but } other {# data sources deleted successfully, but }}{partialCount, plural, one {# source} other {# sources}} still {partialCount, plural, one {has} other {have}} related resources that could not be removed',
              values: {
                deletedCount: fullyDeleted.length,
                partialCount: partiallyDeleted.length,
              },
            }),
          });
        } else {
          toasts?.addDanger({
            title: i18n.translate('xpack.dataSources.bulkDeleteActiveSources.failureToast', {
              defaultMessage:
                '{failedCount, plural, one {# data source} other {# data sources}} failed to delete',
              values: { failedCount: failed.length },
            }),
          });
        }

        onSuccess?.();
      },
      onError: (error: { body: KibanaServerError }) => {
        toasts?.addError(new Error(error.body?.message || 'Unknown error'), {
          title: i18n.translate('xpack.dataSources.bulkDeleteActiveSources.errorToast', {
            defaultMessage: 'Failed to delete data sources',
          }),
          toastMessage: error.body?.message,
        });
      },
    }
  );
};
