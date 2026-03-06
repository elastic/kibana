/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@kbn/react-query';
import { i18n } from '@kbn/i18n';
import { useService, CoreStart } from '@kbn/core-di-browser';
import type { CreateRuleData } from '@kbn/alerting-v2-schemas';
import { RulesApi } from '../services/rules_api';
import { ruleKeys } from './query_key_factory';

export const useCreateRule = () => {
  const rulesApi = useService(RulesApi);
  const { toasts } = useService(CoreStart('notifications'));
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ruleKeys.create(),
    mutationFn: (payload: CreateRuleData) => rulesApi.createRule(payload),
    onSuccess: () => {
      toasts.addSuccess(
        i18n.translate('xpack.alertingV2.hooks.useCreateRule.successMessage', {
          defaultMessage: 'Rule created successfully',
        })
      );
      queryClient.invalidateQueries(ruleKeys.lists());
    },
    onError: () => {
      toasts.addDanger(
        i18n.translate('xpack.alertingV2.hooks.useCreateRule.errorMessage', {
          defaultMessage: 'Failed to create rule',
        })
      );
    },
  });
};
