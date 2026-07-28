/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@kbn/react-query';
import { i18n } from '@kbn/i18n';
import { useService, CoreStart } from '@kbn/core-di-browser';
import { RulesApi, type BulkResponse } from '../services/rules_api';
import type { BulkSelection } from './use_bulk_select';
import { addBulkMutationDangerToast } from './bulk_mutation_toasts';
import { ruleKeys } from './query_key_factory';

/** Dispatches to the by-ID or by-query update-api-key endpoint based on the selection mode. */
const dispatchUpdateApiKey = (rulesApi: RulesApi, params: BulkSelection): Promise<BulkResponse> => {
  if (params.mode === 'by_ids') {
    return rulesApi.bulkUpdateRuleApiKey({ ids: params.ids });
  }
  const { mode: _mode, ...query } = params;
  return rulesApi.updateRuleApiKeyByQuery({ ...query, force: true });
};

/**
 * Rotates the executor task API key for the selected rules to one derived from
 * the current user's credentials. Backs both the single-rule (details page) and
 * bulk (rules list) "Update API key" actions — the single case passes a
 * `by_ids` selection with a one-element `ids` array.
 */
export const useBulkUpdateRuleApiKey = () => {
  const rulesApi = useService(RulesApi);
  const { toasts } = useService(CoreStart('notifications'));
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: BulkSelection) => dispatchUpdateApiKey(rulesApi, params),
    onSuccess: (data, params) => {
      if (data.errors.length > 0) {
        toasts.addWarning(
          i18n.translate('xpack.alertingV2.hooks.useBulkUpdateRuleApiKey.partialSuccessMessage', {
            defaultMessage:
              'Update API key completed with {errorCount, plural, one {# error} other {# errors}}',
            values: { errorCount: data.errors.length },
          })
        );
      } else {
        toasts.addSuccess(
          i18n.translate('xpack.alertingV2.hooks.useBulkUpdateRuleApiKey.successMessage', {
            defaultMessage:
              'API key updated for {affectedCount, plural, one {# rule} other {# rules}}',
            values: { affectedCount: data.affected_count },
          })
        );
      }
      queryClient.invalidateQueries(ruleKeys.lists());
      // Only a by-ID selection carries the affected ids; refresh each rule's
      // detail query so the details page reflects the new audit metadata.
      if (params.mode === 'by_ids') {
        params.ids.forEach((id) => queryClient.invalidateQueries(ruleKeys.detail(id)));
      }
    },
    onError: (error) => {
      addBulkMutationDangerToast(
        toasts,
        i18n.translate('xpack.alertingV2.hooks.useBulkUpdateRuleApiKey.errorTitle', {
          defaultMessage: 'Failed to update API key',
        }),
        error
      );
    },
  });
};
