/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@kbn/react-query';
import { i18n } from '@kbn/i18n';
import { useRuleListServices } from './rule_list_context';
import { bulkDeleteRules, type BulkOperationParams } from './rules_api';
import { ruleKeys } from './query_key_factory';

export const useBulkDeleteRules = () => {
  const { http, notifications } = useRuleListServices();
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ruleKeys.bulkDelete(),
    mutationFn: (params: BulkOperationParams) => bulkDeleteRules(http, params),
    onSuccess: (data) => {
      if (data.errors.length > 0) {
        notifications.toasts.addWarning(
          i18n.translate('xpack.alertingV2.hooks.useBulkDeleteRules.partialSuccessMessage', {
            defaultMessage:
              'Bulk delete completed with {errorCount, plural, one {# error} other {# errors}}',
            values: { errorCount: data.errors.length },
          })
        );
      } else {
        notifications.toasts.addSuccess(
          i18n.translate('xpack.alertingV2.hooks.useBulkDeleteRules.successMessage', {
            defaultMessage: 'Rules deleted successfully',
          })
        );
      }
      queryClient.invalidateQueries(ruleKeys.lists());
    },
    onError: () => {
      notifications.toasts.addDanger(
        i18n.translate('xpack.alertingV2.hooks.useBulkDeleteRules.errorMessage', {
          defaultMessage: 'Failed to delete rules',
        })
      );
    },
  });
};
