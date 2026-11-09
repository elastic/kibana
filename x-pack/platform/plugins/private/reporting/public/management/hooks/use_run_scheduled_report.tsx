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
import { runScheduledReport } from '../apis/run_scheduled_report';
import { mutationKeys } from '../mutation_keys';
import { queryKeys } from '../query_keys';

export type ServerError = IHttpFetchError<ResponseErrorBody>;

const getKey = mutationKeys.runScheduledReport;

export const useRunScheduledReport = () => {
  const queryClient = useQueryClient();
  const {
    http,
    notifications: { toasts },
  } = useKibana().services;

  return useMutation({
    mutationKey: getKey(),
    mutationFn: ({ id }: { id: string }) =>
      runScheduledReport({
        http,
        id,
      }),
    onError: (error: ServerError) => {
      toasts.addError(error, {
        title: i18n.translate('xpack.reporting.schedules.reports.runNowError', {
          defaultMessage: 'Error running scheduled report',
        }),
      });
    },
    onSuccess: () => {
      toasts.addSuccess(
        i18n.translate('xpack.reporting.schedules.reports.runNow', {
          defaultMessage: 'Report scheduled to run now',
        })
      );
      queryClient.invalidateQueries({
        queryKey: queryKeys.allSchedules(),
        refetchType: 'active',
      });
    },
  });
};
