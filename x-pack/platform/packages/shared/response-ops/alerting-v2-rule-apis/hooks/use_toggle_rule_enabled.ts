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
import { updateRule } from '../apis/rules_api';
import { queryKeys } from '../query_keys';

export const useToggleRuleEnabled = ({
  http,
  notifications,
}: {
  http: HttpStart;
  notifications: NotificationsStart;
}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      updateRule(http, id, { enabled }),
    onSuccess: (_data, variables) => {
      notifications.toasts.addSuccess(
        variables.enabled
          ? i18n.translate('xpack.alertingV2.hooks.useToggleRuleEnabled.enabledMessage', {
              defaultMessage: 'Rule enabled',
            })
          : i18n.translate('xpack.alertingV2.hooks.useToggleRuleEnabled.disabledMessage', {
              defaultMessage: 'Rule disabled',
            })
      );
      queryClient.invalidateQueries(queryKeys.lists());
      queryClient.invalidateQueries(queryKeys.detail(variables.id));
    },
    onError: () => {
      notifications.toasts.addDanger(
        i18n.translate('xpack.alertingV2.hooks.useToggleRuleEnabled.errorMessage', {
          defaultMessage: 'Failed to update rule status',
        })
      );
    },
  });
};
