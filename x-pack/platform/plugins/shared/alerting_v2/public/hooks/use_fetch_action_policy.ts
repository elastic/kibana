/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { useService, CoreStart } from '@kbn/core-di-browser';
import { i18n } from '@kbn/i18n';
import type { ActionPolicyResponse } from '@kbn/alerting-v2-schemas';
import { ActionPoliciesApi } from '../services/action_policies_api';
import { actionPolicyKeys } from './query_key_factory';

export const useFetchActionPolicy = (id: string | undefined) => {
  const actionPoliciesApi = useService(ActionPoliciesApi);
  const { toasts } = useService(CoreStart('notifications'));

  return useQuery<ActionPolicyResponse, Error>({
    queryKey: actionPolicyKeys.detail(id!),
    queryFn: () => actionPoliciesApi.getActionPolicy(id!),
    enabled: !!id,
    refetchOnWindowFocus: false,
    onError: (error: Error) => {
      toasts.addError(error, {
        title: i18n.translate('xpack.alertingV2.actionPolicy.fetchError', {
          defaultMessage: 'Failed to load action policy',
        }),
      });
    },
  });
};
