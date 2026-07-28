/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@kbn/react-query';
import { i18n } from '@kbn/i18n';
import { useService, CoreStart } from '@kbn/core-di-browser';
import type { CreateRuleData, RuleResponse } from '@kbn/alerting-v2-schemas';
import { RulesApi } from '../services/rules_api';
import { ruleKeys } from './query_key_factory';
import { enrichHttpErrorMessage } from '../utils/enrich_http_error';
import { getFriendlyRuleHttpErrorToastMessage } from '../utils/friendly_http_error';

/**
 * Creates a rule from template create-data and leaves it disabled.
 *
 * The create API always persists `enabled: true` and schedules an executor task,
 * so this installs via create + bulk disable (which removes the task).
 */
export const useInstallDisabledRule = () => {
  const rulesApi = useService(RulesApi);
  const { toasts } = useService(CoreStart('notifications'));
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateRuleData): Promise<RuleResponse> => {
      const rule = await rulesApi.createRule(payload);
      try {
        await rulesApi.bulkDisableRules({ ids: [rule.id] });
      } catch (error) {
        await rulesApi.deleteRule(rule.id).catch(() => undefined);
        throw error;
      }
      return { ...rule, enabled: false };
    },
    onSuccess: (data) => {
      toasts.addSuccess(
        i18n.translate('xpack.alertingV2.hooks.useInstallDisabledRule.successMessage', {
          defaultMessage: 'Rule "{ruleName}" installed',
          values: { ruleName: data.metadata.name },
        })
      );
      queryClient.invalidateQueries(ruleKeys.lists());
      queryClient.invalidateQueries(ruleKeys.tags());
    },
    onError: (error: Error) => {
      toasts.addError(enrichHttpErrorMessage(error), {
        title: i18n.translate('xpack.alertingV2.hooks.useInstallDisabledRule.errorMessage', {
          defaultMessage: 'Rule not installed',
        }),
        toastMessage: getFriendlyRuleHttpErrorToastMessage(error),
      });
    },
  });
};
