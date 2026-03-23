/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@kbn/react-query';
import { i18n } from '@kbn/i18n';
import type { HttpStart } from '@kbn/core-http-browser';
import type { NotificationsStart } from '@kbn/core-notifications-browser';
import { bulkEnableRules, bulkDisableRules } from '../apis/rules_api';
import type { BulkOperationParams } from '../types';
import { mutationKeys } from '../mutation_keys';
import { queryKeys } from '../query_keys';

export const useBulkEnableRules = ({
  http,
  notifications,
}: {
  http: HttpStart;
  notifications: NotificationsStart;
}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.bulkEnable(),
    mutationFn: (params: BulkOperationParams) => bulkEnableRules(http, params),
    onSuccess: (data) => {
      if (data.errors.length > 0) {
        notifications.toasts.addWarning(
          i18n.translate('xpack.alertingV2.hooks.useBulkEnableRules.partialSuccessMessage', {
            defaultMessage:
              'Bulk enable completed with {errorCount, plural, one {# error} other {# errors}}',
            values: { errorCount: data.errors.length },
          })
        );
      } else {
        notifications.toasts.addSuccess(
          i18n.translate('xpack.alertingV2.hooks.useBulkEnableRules.successMessage', {
            defaultMessage: 'Rules enabled successfully',
          })
        );
      }
      queryClient.invalidateQueries(queryKeys.lists());
    },
    onError: () => {
      notifications.toasts.addDanger(
        i18n.translate('xpack.alertingV2.hooks.useBulkEnableRules.errorMessage', {
          defaultMessage: 'Failed to enable rules',
        })
      );
    },
  });
};

export const useBulkDisableRules = ({
  http,
  notifications,
}: {
  http: HttpStart;
  notifications: NotificationsStart;
}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.bulkDisable(),
    mutationFn: (params: BulkOperationParams) => bulkDisableRules(http, params),
    onSuccess: (data) => {
      if (data.errors.length > 0) {
        notifications.toasts.addWarning(
          i18n.translate('xpack.alertingV2.hooks.useBulkDisableRules.partialSuccessMessage', {
            defaultMessage:
              'Bulk disable completed with {errorCount, plural, one {# error} other {# errors}}',
            values: { errorCount: data.errors.length },
          })
        );
      } else {
        notifications.toasts.addSuccess(
          i18n.translate('xpack.alertingV2.hooks.useBulkDisableRules.successMessage', {
            defaultMessage: 'Rules disabled successfully',
          })
        );
      }
      queryClient.invalidateQueries(queryKeys.lists());
    },
    onError: () => {
      notifications.toasts.addDanger(
        i18n.translate('xpack.alertingV2.hooks.useBulkDisableRules.errorMessage', {
          defaultMessage: 'Failed to disable rules',
        })
      );
    },
  });
};
