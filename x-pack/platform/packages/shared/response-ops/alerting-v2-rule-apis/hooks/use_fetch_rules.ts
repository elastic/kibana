/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { i18n } from '@kbn/i18n';
import type { HttpStart } from '@kbn/core-http-browser';
import type { NotificationsStart } from '@kbn/core-notifications-browser';
import { listRules } from '../apis/rules_api';
import { queryKeys } from '../query_keys';

export const useFetchRules = (
  { http, notifications }: { http: HttpStart; notifications: NotificationsStart },
  { page, perPage }: { page: number; perPage: number }
) => {
  return useQuery({
    queryKey: queryKeys.list({ page, perPage }),
    queryFn: () => listRules(http, { page, perPage }),
    onError: () => {
      notifications.toasts.addDanger(
        i18n.translate('xpack.alertingV2.hooks.useFetchRules.errorMessage', {
          defaultMessage: 'Failed to load rules',
        })
      );
    },
    keepPreviousData: true,
  });
};
