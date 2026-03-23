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
import { bulkDeleteRules } from '../apis/rules_api';
import type { BulkOperationParams } from '../types';
import { mutationKeys } from '../mutation_keys';
import { queryKeys } from '../query_keys';

export const useBulkDeleteRules = ({
  http,
  notifications,
}: {
  http: HttpStart;
  notifications: NotificationsStart;
}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.bulkDelete(),
    mutationFn: (params: BulkOperationParams) => bulkDeleteRules(http, params),
    onSuccess: (data) => {
      if (data.errors.length > 0) {
        notifications.toasts.addWarning(
          i18n.translate('xpack.alertingV2.hooks.useBulkDeleteRules.partialSuccessMessage', {
            defaultMessage:
              'Bulk delete completed with {errorCount, plural, one {# error} other {# errors}}',
            values: { errorCount: data.errors.length },
          })
        );
      } else {
        notifications.toasts.addSuccess(
          i18n.translate('xpack.alertingV2.hooks.useBulkDeleteRules.successMessage', {
            defaultMessage: 'Rules deleted successfully',
          })
        );
      }
      queryClient.invalidateQueries(queryKeys.lists());
    },
    onError: () => {
      notifications.toasts.addDanger(
        i18n.translate('xpack.alertingV2.hooks.useBulkDeleteRules.errorMessage', {
          defaultMessage: 'Failed to delete rules',
        })
      );
    },
  });
};
