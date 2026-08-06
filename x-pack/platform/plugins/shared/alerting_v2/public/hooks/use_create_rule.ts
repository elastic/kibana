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
import { enrichHttpErrorMessage } from '../utils/enrich_http_error';
import { getFriendlyRuleHttpErrorToastMessage } from '../utils/friendly_http_error';

const ERROR_TITLE = i18n.translate('xpack.alertingV2.hooks.useCreateRule.errorMessage', {
  defaultMessage: 'Rule not created',
});

interface UseCreateRuleOptions {
  /**
   * Overrides the default error toast. Call `showDefaultToast` to fall back to
   * the enriched addError toast for statuses the caller does not handle.
   * Temporary escape hatch for compose-discover save UX; prefer removing once
   * conditionless alert queries are saveable again.
   */
  onErrorToast?: (error: Error, showDefaultToast: () => void) => void;
}

export const useCreateRule = ({ onErrorToast }: UseCreateRuleOptions = {}) => {
  const rulesApi = useService(RulesApi);
  const { toasts } = useService(CoreStart('notifications'));
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateRuleData) => rulesApi.createRule(payload),
    onSuccess: (data) => {
      toasts.addSuccess(
        i18n.translate('xpack.alertingV2.hooks.useCreateRule.successMessage', {
          defaultMessage: 'Rule "{ruleName}" created successfully',
          values: { ruleName: data.metadata.name },
        })
      );
      queryClient.invalidateQueries(ruleKeys.lists());
      queryClient.invalidateQueries(ruleKeys.tags());
    },
    onError: (error: Error) => {
      const showDefaultToast = () =>
        toasts.addError(enrichHttpErrorMessage(error), {
          title: ERROR_TITLE,
          toastMessage: getFriendlyRuleHttpErrorToastMessage(error),
        });
      if (onErrorToast) {
        onErrorToast(error, showDefaultToast);
        return;
      }
      showDefaultToast();
    },
  });
};
