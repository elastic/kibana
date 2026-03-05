/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@kbn/react-query';
import { useService, CoreStart } from '@kbn/core-di-browser';
import { i18n } from '@kbn/i18n';
import { NotificationPoliciesApi } from '../services/notification_policies_api';
import { notificationPolicyKeys } from './query_key_factory';

export const useDeleteNotificationPolicy = () => {
  const notificationPoliciesApi = useService(NotificationPoliciesApi);
  const { toasts } = useService(CoreStart('notifications'));
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationKey: notificationPolicyKeys.delete(),
    mutationFn: (id) => notificationPoliciesApi.deleteNotificationPolicy(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationPolicyKeys.lists(), exact: false });
      toasts.addSuccess(
        i18n.translate('xpack.alertingV2.notificationPolicy.deleteSuccess', {
          defaultMessage: 'Notification policy deleted successfully',
        })
      );
    },
    onError: (error) => {
      toasts.addError(error, {
        title: i18n.translate('xpack.alertingV2.notificationPolicy.deleteError', {
          defaultMessage: 'Failed to delete notification policy',
        }),
      });
    },
  });
};
