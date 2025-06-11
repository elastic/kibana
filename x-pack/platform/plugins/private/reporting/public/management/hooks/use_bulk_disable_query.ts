/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { HttpSetup, IHttpFetchError, ResponseErrorBody, ToastsStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { bulkDisableScheduledReports } from '../apis/bulk_disable_scheduled_reports';
import { mutationKeys, queryKeys } from '../query_keys';

export type ServerError = IHttpFetchError<ResponseErrorBody>;

const getKey = mutationKeys.bulkDisableScheduledReports;

export const useBulkDisableQuery = (props: { http: HttpSetup; toasts: ToastsStart }) => {
  const { http, toasts } = props;
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: getKey(),
    mutationFn: ({ ids }: { ids: string[] }) =>
      bulkDisableScheduledReports({
        http,
        ids,
      }),
    onError: (error: ServerError) => {
      toasts.addError(error, {
        title: i18n.translate('xpack.reporting.schedules.reports.disableError', {
          defaultMessage: 'Error disabling scheduled report',
        }),
      });
    },
    onSuccess: () => {
      toasts.addSuccess(
        i18n.translate('xpack.reporting.schedules.reports.disabled', {
          defaultMessage: 'Scheduled report disabled',
        })
      );
      queryClient.invalidateQueries({
        queryKey: queryKeys.getScheduledList(),
      });
    },
  });
};
