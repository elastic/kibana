/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MouseEvent } from 'react';
import { useMutation, useQueryClient } from '@kbn/react-query';
import { i18n } from '@kbn/i18n';
import { useService, CoreStart } from '@kbn/core-di-browser';
import type { CreateRuleData, RuleResponse } from '@kbn/alerting-v2-schemas';
import { RulesApi } from '../services/rules_api';
import { paths } from '../constants';
import { ruleKeys } from './query_key_factory';
import { invalidateRulesContentList } from './invalidate_rules_content_list';
import { enrichHttpErrorMessage } from '../utils/enrich_http_error';
import { getFriendlyRuleHttpErrorToastMessage } from '../utils/friendly_http_error';

export interface CreateRuleVariables {
  payload: CreateRuleData;
  enabled?: boolean;
}

export const useCreateRule = () => {
  const rulesApi = useService(RulesApi);
  const { toasts } = useService(CoreStart('notifications'));
  const { navigateToUrl } = useService(CoreStart('application'));
  const { basePath } = useService(CoreStart('http'));
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ payload, enabled = true }: CreateRuleVariables): Promise<RuleResponse> => {
      const rule = await rulesApi.createRule(payload);
      if (enabled) {
        return rule;
      }
      return rulesApi.disableRule(rule.id);
    },
    onSuccess: (data) => {
      const href = basePath.prepend(paths.ruleDetails(data.id));
      toasts.addSuccess({
        title: i18n.translate('xpack.alertingV2.hooks.useCreateRule.successMessage', {
          defaultMessage: 'Rule "{ruleName}" created successfully',
          values: { ruleName: data.metadata.name },
        }),
        actionProps: {
          primary: {
            children: i18n.translate('xpack.alertingV2.hooks.useCreateRule.viewRuleButtonLabel', {
              defaultMessage: 'View rule',
            }),
            href,
            onClick: (event: MouseEvent) => {
              event.preventDefault();
              void navigateToUrl(href);
            },
            'data-test-subj': 'alertingV2ViewRuleToastLink',
          },
        },
      });
      void invalidateRulesContentList();
      queryClient.invalidateQueries(ruleKeys.lists());
      queryClient.invalidateQueries(ruleKeys.allTags());
    },
    onError: (error: Error) => {
      toasts.addError(enrichHttpErrorMessage(error), {
        title: i18n.translate('xpack.alertingV2.hooks.useCreateRule.errorMessage', {
          defaultMessage: 'Rule not created',
        }),
        toastMessage: getFriendlyRuleHttpErrorToastMessage(error),
      });
    },
  });
};
