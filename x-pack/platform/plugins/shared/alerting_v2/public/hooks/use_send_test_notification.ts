/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionPolicyTestSendResponse } from '@kbn/alerting-v2-schemas';
import { CoreStart, useService } from '@kbn/core-di-browser';
import { i18n } from '@kbn/i18n';
import { useMutation } from '@kbn/react-query';
import { ActionPoliciesApi } from '../services/action_policies_api';

interface SendTestNotificationVariables {
  seed: number;
  destinationIds: string[];
}

export const useSendTestNotification = (policyId: string) => {
  const actionPoliciesApi = useService(ActionPoliciesApi);
  const { toasts } = useService(CoreStart('notifications'));

  return useMutation<ActionPolicyTestSendResponse, Error, SendTestNotificationVariables>({
    mutationFn: ({ seed, destinationIds }) =>
      actionPoliciesApi.sendTestNotification(policyId, {
        seed,
        destination_ids: destinationIds,
      }),
    onError: (error) => {
      toasts.addError(error, {
        title: i18n.translate('xpack.alertingV2.actionPolicy.sendTestNotification.sendError', {
          defaultMessage: 'Failed to send the test notification',
        }),
      });
    },
  });
};
