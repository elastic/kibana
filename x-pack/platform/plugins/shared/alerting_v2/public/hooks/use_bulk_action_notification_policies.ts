/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BulkActionNotificationPoliciesBody } from '@kbn/alerting-v2-schemas';
import { CoreStart, useService } from '@kbn/core-di-browser';
import { i18n } from '@kbn/i18n';
import { useMutation, useQueryClient } from '@kbn/react-query';
import type { BulkActionNotificationPoliciesResponse } from '../services/notification_policies_api';
import { NotificationPoliciesApi } from '../services/notification_policies_api';
import { notificationPolicyKeys } from './query_key_factory';

const getSuccessMessage = (action: string, count: number): string => {
  switch (action) {
    case 'enable':
      return i18n.translate('xpack.alertingV2.notificationPolicy.bulkEnableSuccess', {
        defaultMessage:
          '{count} {count, plural, one {notification policy} other {notification policies}} enabled',
        values: { count },
      });
    case 'disable':
      return i18n.translate('xpack.alertingV2.notificationPolicy.bulkDisableSuccess', {
        defaultMessage:
          '{count} {count, plural, one {notification policy} other {notification policies}} disabled',
        values: { count },
      });
    case 'delete':
      return i18n.translate('xpack.alertingV2.notificationPolicy.bulkDeleteSuccess', {
        defaultMessage:
          '{count} {count, plural, one {notification policy} other {notification policies}} deleted',
        values: { count },
      });
    case 'snooze':
      return i18n.translate('xpack.alertingV2.notificationPolicy.bulkSnoozeSuccess', {
        defaultMessage:
          '{count} {count, plural, one {notification policy} other {notification policies}} snoozed',
        values: { count },
      });
    case 'unsnooze':
      return i18n.translate('xpack.alertingV2.notificationPolicy.bulkUnsnoozeSuccess', {
        defaultMessage:
          'Snooze cancelled for {count} {count, plural, one {notification policy} other {notification policies}}',
        values: { count },
      });
    case 'update_api_key':
      return i18n.translate('xpack.alertingV2.notificationPolicy.bulkUpdateApiKeySuccess', {
        defaultMessage:
          'API {count, plural, one {key} other {keys}} updated for {count} {count, plural, one {notification policy} other {notification policies}}',
        values: { count },
      });
    default:
      return i18n.translate('xpack.alertingV2.notificationPolicy.bulkActionSuccess', {
        defaultMessage:
          '{count} {count, plural, one {notification policy} other {notification policies}} updated',
        values: { count },
      });
  }
};

export const useBulkActionNotificationPolicies = () => {
  const notificationPoliciesApi = useService(NotificationPoliciesApi);
  const { toasts } = useService(CoreStart('notifications'));
  const queryClient = useQueryClient();

  return useMutation<
    BulkActionNotificationPoliciesResponse,
    Error,
    BulkActionNotificationPoliciesBody
  >({
    mutationFn: (body) => notificationPoliciesApi.bulkActionNotificationPolicies(body),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: notificationPolicyKeys.lists(), exact: false });

      if (data.errors.length > 0) {
        toasts.addWarning({
          title: i18n.translate('xpack.alertingV2.notificationPolicy.bulkActionPartialSuccess', {
            defaultMessage:
              '{processed} of {total} notification policies updated. {errorCount} failed.',
            values: {
              processed: data.processed,
              total: data.total,
              errorCount: data.errors.length,
            },
          }),
        });
      } else {
        const actionType = variables.actions[0]?.action;
        toasts.addSuccess(getSuccessMessage(actionType, data.processed));
      }
    },
    onError: (error) => {
      toasts.addError(error, {
        title: i18n.translate('xpack.alertingV2.notificationPolicy.bulkActionError', {
          defaultMessage: 'Failed to perform bulk action on notification policies',
        }),
      });
    },
  });
};
