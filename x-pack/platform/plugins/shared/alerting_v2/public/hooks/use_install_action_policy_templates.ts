/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@kbn/react-query';
import { useService, CoreStart } from '@kbn/core-di-browser';
import { i18n } from '@kbn/i18n';
import type { InstallActionPolicyTemplatesResponse } from '@kbn/alerting-v2-schemas';
import { ActionPoliciesApi } from '../services/action_policies_api';
import { invalidateMatchedActionPolicies } from './invalidate_matched_action_policies';
import { actionPolicyKeys } from './query_key_factory';

export const useInstallActionPolicyTemplates = () => {
  const actionPoliciesApi = useService(ActionPoliciesApi);
  const { toasts } = useService(CoreStart('notifications'));
  const queryClient = useQueryClient();

  return useMutation<InstallActionPolicyTemplatesResponse, Error, void>({
    mutationFn: () => actionPoliciesApi.installActionPolicyTemplates(),
    onSuccess: ({ policies }) => {
      queryClient.invalidateQueries({ queryKey: actionPolicyKeys.lists(), exact: false });
      invalidateMatchedActionPolicies(queryClient);

      const created = policies.filter(({ status }) => status === 'created').length;
      toasts.addSuccess(
        i18n.translate('xpack.alertingV2.actionPolicy.installTemplates.success', {
          defaultMessage:
            '{created, plural, =0 {No new template action policies were created} one {# template action policy created} other {# template action policies created}}. Template policies are disabled until you enable them.',
          values: { created },
        })
      );
    },
    onError: (error) => {
      toasts.addError(error, {
        title: i18n.translate('xpack.alertingV2.actionPolicy.installTemplates.error', {
          defaultMessage: 'Failed to install template action policies',
        }),
      });
    },
  });
};
