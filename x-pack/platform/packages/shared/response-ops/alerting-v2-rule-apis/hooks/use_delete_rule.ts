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
import { deleteRule } from '../apis/rules_api';
import { mutationKeys } from '../mutation_keys';
import { queryKeys } from '../query_keys';

export const useDeleteRule = ({
  http,
  notifications,
}: {
  http: HttpStart;
  notifications: NotificationsStart;
}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.delete(),
    mutationFn: (id: string) => deleteRule(http, id),
    onSuccess: () => {
      notifications.toasts.addSuccess(
        i18n.translate('xpack.alertingV2.hooks.useDeleteRule.successMessage', {
          defaultMessage: 'Rule deleted successfully',
        })
      );
      queryClient.invalidateQueries(queryKeys.lists());
      queryClient.invalidateQueries(queryKeys.details());
    },
    onError: () => {
      notifications.toasts.addDanger(
        i18n.translate('xpack.alertingV2.hooks.useDeleteRule.errorMessage', {
          defaultMessage: 'Failed to delete rule',
        })
      );
    },
  });
};
