/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@kbn/react-query';
import { useService, CoreStart } from '@kbn/core-di-browser';
import { i18n } from '@kbn/i18n';
import type { ActionPolicyResponse, UpdateActionPolicyBody } from '@kbn/alerting-v2-schemas';
import { ActionPoliciesApi } from '../services/action_policies_api';
import { actionPolicyKeys } from './query_key_factory';

interface UpdateActionPolicyVariables {
  id: string;
  data: UpdateActionPolicyBody;
}

export const useUpdateActionPolicy = () => {
  const actionPoliciesApi = useService(ActionPoliciesApi);
  const { toasts } = useService(CoreStart('notifications'));
  const queryClient = useQueryClient();

  return useMutation<ActionPolicyResponse, Error, UpdateActionPolicyVariables>({
    mutationFn: ({ id, data }) => actionPoliciesApi.updateActionPolicy(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: actionPolicyKeys.lists(), exact: false });
      queryClient.invalidateQueries({ queryKey: actionPolicyKeys.detail(id), exact: false });
      queryClient.invalidateQueries({ queryKey: actionPolicyKeys.allTags(), exact: false });
      toasts.addSuccess(
        i18n.translate('xpack.alertingV2.actionPolicy.updateSuccess', {
          defaultMessage: 'Action policy updated successfully',
        })
      );
    },
    onError: (error) => {
      toasts.addError(error, {
        title: i18n.translate('xpack.alertingV2.actionPolicy.updateError', {
          defaultMessage: 'Failed to update action policy',
        }),
      });
    },
  });
};
