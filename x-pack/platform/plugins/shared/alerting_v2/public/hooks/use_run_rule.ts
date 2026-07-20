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

export const useRunRule = () => {
  const rulesApi = useService(RulesApi);
  const { toasts } = useService(CoreStart('notifications'));
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id }: { id: string }) => rulesApi.runRule(id),
    onSuccess: async (_data, variables) => {
      toasts.addSuccess(
        i18n.translate('xpack.alertingV2.hooks.useRunRule.successMessage', {
          defaultMessage: 'Rule run started',
        })
      );

      await queryClient.invalidateQueries(ruleKeys.detail(variables.id));
    },
    onError: () => {
      toasts.addDanger(
        i18n.translate('xpack.alertingV2.hooks.useRunRule.errorMessage', {
          defaultMessage: 'Failed to run rule',
        })
      );
    },
  });
};
