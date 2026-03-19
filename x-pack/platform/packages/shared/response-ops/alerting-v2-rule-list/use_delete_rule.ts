/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@kbn/react-query';
import { i18n } from '@kbn/i18n';
import { useRuleListServices } from './rule_list_context';
import { deleteRule } from './rules_api';
import { ruleKeys } from './query_key_factory';

export const useDeleteRule = () => {
  const { http, notifications } = useRuleListServices();
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ruleKeys.delete(),
    mutationFn: (id: string) => deleteRule(http, id),
    onSuccess: () => {
      notifications.toasts.addSuccess(
        i18n.translate('xpack.alertingV2.hooks.useDeleteRule.successMessage', {
          defaultMessage: 'Rule deleted successfully',
        })
      );
      queryClient.invalidateQueries(ruleKeys.lists());
      queryClient.invalidateQueries(ruleKeys.details());
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
