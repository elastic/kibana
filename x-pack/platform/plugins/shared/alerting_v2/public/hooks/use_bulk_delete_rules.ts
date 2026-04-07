/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@kbn/react-query';
import { i18n } from '@kbn/i18n';
import { useService, CoreStart } from '@kbn/core-di-browser';
import { RulesApi, type BulkOperationParams } from '../services/rules_api';
import { ruleKeys } from './query_key_factory';

export const useBulkDeleteRules = () => {
  const rulesApi = useService(RulesApi);
  const { toasts } = useService(CoreStart('notifications'));
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: BulkOperationParams) => rulesApi.bulkDeleteRules(params),
    onSuccess: (data) => {
      if (data.errors.length > 0) {
        toasts.addWarning(
          i18n.translate('xpack.alertingV2.hooks.useBulkDeleteRules.partialSuccessMessage', {
            defaultMessage:
              'Bulk delete completed with {errorCount, plural, one {# error} other {# errors}}',
            values: { errorCount: data.errors.length },
          })
        );
      } else {
        toasts.addSuccess(
          i18n.translate('xpack.alertingV2.hooks.useBulkDeleteRules.successMessage', {
            defaultMessage: 'Rules deleted successfully',
          })
        );
      }
      queryClient.invalidateQueries(ruleKeys.lists());
      queryClient.invalidateQueries(ruleKeys.tags());
    },
    onError: () => {
      toasts.addDanger(
        i18n.translate('xpack.alertingV2.hooks.useBulkDeleteRules.errorMessage', {
          defaultMessage: 'Failed to delete rules',
        })
      );
    },
  });
};
