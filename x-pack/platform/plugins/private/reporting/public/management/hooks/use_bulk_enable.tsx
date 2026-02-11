/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@kbn/react-query';
import type { IHttpFetchError, ResponseErrorBody } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/reporting-public';
import { bulkEnableScheduledReports } from '../apis/bulk_enable_scheduled_reports';
import { mutationKeys } from '../mutation_keys';

export type ServerError = IHttpFetchError<ResponseErrorBody>;

const getKey = mutationKeys.bulkEnableScheduledReports;

export const useBulkEnable = () => {
  const queryClient = useQueryClient();
  const {
    http,
    notifications: { toasts },
  } = useKibana().services;

  return useMutation({
    mutationKey: getKey(),
    mutationFn: ({ ids }: { ids: string[] }) =>
      bulkEnableScheduledReports({
        http,
        ids,
      }),
    onError: (error: ServerError) => {
      toasts.addError(error, {
        title: i18n.translate('xpack.reporting.schedules.reports.enableError', {
          defaultMessage: 'Error enabling scheduled report',
        }),
      });
    },
    onSuccess: () => {
      toasts.addSuccess(
        i18n.translate('xpack.reporting.schedules.reports.enabled', {
          defaultMessage: 'Scheduled report enabled',
        })
      );
      queryClient.invalidateQueries({
        queryKey: ['reporting', 'scheduledList'],
        refetchType: 'active',
      });
    },
  });
};
