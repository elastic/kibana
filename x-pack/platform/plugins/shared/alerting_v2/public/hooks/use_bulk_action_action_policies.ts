/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BulkActionActionPoliciesBody } from '@kbn/alerting-v2-schemas';
import { CoreStart, useService } from '@kbn/core-di-browser';
import { i18n } from '@kbn/i18n';
import { useMutation, useQueryClient } from '@kbn/react-query';
import type { BulkActionActionPoliciesResponse } from '../services/action_policies_api';
import { ActionPoliciesApi } from '../services/action_policies_api';
import { actionPolicyKeys } from './query_key_factory';

const getSuccessMessage = (action: string, count: number): string => {
  switch (action) {
    case 'enable':
      return i18n.translate('xpack.alertingV2.actionPolicy.bulkEnableSuccess', {
        defaultMessage:
          '{count} {count, plural, one {action policy} other {action policies}} enabled',
        values: { count },
      });
    case 'disable':
      return i18n.translate('xpack.alertingV2.actionPolicy.bulkDisableSuccess', {
        defaultMessage:
          '{count} {count, plural, one {action policy} other {action policies}} disabled',
        values: { count },
      });
    case 'delete':
      return i18n.translate('xpack.alertingV2.actionPolicy.bulkDeleteSuccess', {
        defaultMessage:
          '{count} {count, plural, one {action policy} other {action policies}} deleted',
        values: { count },
      });
    case 'snooze':
      return i18n.translate('xpack.alertingV2.actionPolicy.bulkSnoozeSuccess', {
        defaultMessage:
          '{count} {count, plural, one {action policy} other {action policies}} snoozed',
        values: { count },
      });
    case 'unsnooze':
      return i18n.translate('xpack.alertingV2.actionPolicy.bulkUnsnoozeSuccess', {
        defaultMessage:
          'Snooze cancelled for {count} {count, plural, one {action policy} other {action policies}}',
        values: { count },
      });
    case 'update_api_key':
      return i18n.translate('xpack.alertingV2.actionPolicy.bulkUpdateApiKeySuccess', {
        defaultMessage:
          'API {count, plural, one {key} other {keys}} updated for {count} {count, plural, one {action policy} other {action policies}}',
        values: { count },
      });
    default:
      return i18n.translate('xpack.alertingV2.actionPolicy.bulkActionSuccess', {
        defaultMessage:
          '{count} {count, plural, one {action policy} other {action policies}} updated',
        values: { count },
      });
  }
};

export const useBulkActionActionPolicies = () => {
  const actionPoliciesApi = useService(ActionPoliciesApi);
  const { toasts } = useService(CoreStart('notifications'));
  const queryClient = useQueryClient();

  return useMutation<BulkActionActionPoliciesResponse, Error, BulkActionActionPoliciesBody>({
    mutationFn: (body) => actionPoliciesApi.bulkActionActionPolicies(body),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: actionPolicyKeys.lists(), exact: false });

      if (data.errors.length > 0) {
        toasts.addWarning({
          title: i18n.translate('xpack.alertingV2.actionPolicy.bulkActionPartialSuccess', {
            defaultMessage: '{processed} of {total} action policies updated. {errorCount} failed.',
            values: {
              processed: data.processed,
              total: data.total,
              errorCount: data.errors.length,
            },
          }),
        });
      } else {
        const actionType = variables.actions[0]?.action;
        toasts.addSuccess(getSuccessMessage(actionType, data.processed));
      }
    },
    onError: (error) => {
      toasts.addError(error, {
        title: i18n.translate('xpack.alertingV2.actionPolicy.bulkActionError', {
          defaultMessage: 'Failed to perform bulk action on action policies',
        }),
      });
    },
  });
};
