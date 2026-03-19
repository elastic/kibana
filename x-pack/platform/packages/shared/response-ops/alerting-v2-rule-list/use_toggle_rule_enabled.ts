/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@kbn/react-query';
import { i18n } from '@kbn/i18n';
import { useRuleListServices } from './rule_list_context';
import { updateRule } from './rules_api';
import { ruleKeys } from './query_key_factory';

export const useToggleRuleEnabled = () => {
  const { http, notifications } = useRuleListServices();
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
      queryClient.invalidateQueries(ruleKeys.lists());
      queryClient.invalidateQueries(ruleKeys.detail(variables.id));
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
