/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { useService, CoreStart } from '@kbn/core-di-browser';
import { i18n } from '@kbn/i18n';
import type { FindNotificationPoliciesResponse } from '../services/notification_policies_api';
import { NotificationPoliciesApi } from '../services/notification_policies_api';
import { notificationPolicyKeys } from './query_key_factory';

interface UseFetchNotificationPoliciesParams {
  page: number;
  perPage: number;
}

export const useFetchNotificationPolicies = ({
  page,
  perPage,
}: UseFetchNotificationPoliciesParams) => {
  const notificationPoliciesApi = useService(NotificationPoliciesApi);
  const { toasts } = useService(CoreStart('notifications'));

  return useQuery<FindNotificationPoliciesResponse, Error>({
    queryKey: notificationPolicyKeys.list({ page, perPage }),
    queryFn: () => notificationPoliciesApi.listNotificationPolicies({ page, perPage }),
    refetchOnWindowFocus: false,
    onError: (error: Error) => {
      toasts.addError(error, {
        title: i18n.translate('xpack.alertingV2.notificationPolicies.fetchError', {
          defaultMessage: 'Failed to load notification policies',
        }),
      });
    },
  });
};
