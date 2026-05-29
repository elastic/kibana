/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@kbn/react-query';
import { i18n } from '@kbn/i18n';
import { useService, CoreStart } from '@kbn/core-di-browser';
import { RulesApi } from '../services/rules_api';
import { ruleKeys } from './query_key_factory';

export const useDeleteRule = () => {
  const rulesApi = useService(RulesApi);
  const { toasts } = useService(CoreStart('notifications'));
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id }: { id: string; name: string }) => rulesApi.deleteRule(id),
    onSuccess: (_data, { name }) => {
      toasts.addSuccess(
        i18n.translate('xpack.alertingV2.hooks.useDeleteRule.successMessage', {
          defaultMessage: 'Rule "{ruleName}" deleted successfully',
          values: { ruleName: name },
        })
      );
      queryClient.invalidateQueries(ruleKeys.lists());
      queryClient.invalidateQueries(ruleKeys.tags());
      queryClient.invalidateQueries(ruleKeys.details());
    },
    onError: () => {
      toasts.addDanger(
        i18n.translate('xpack.alertingV2.hooks.useDeleteRule.errorMessage', {
          defaultMessage: 'Failed to delete rule',
        })
      );
    },
  });
};
