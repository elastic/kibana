/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@kbn/react-query';
import { i18n } from '@kbn/i18n';
import { useService, CoreStart } from '@kbn/core-di-browser';
import { RulesApi, type BulkResponse, type BulkByQueryParams } from '../services/rules_api';
import type { BulkSelection } from './use_bulk_select';
import { addBulkMutationDangerToast } from './bulk_mutation_toasts';
import { ruleKeys } from './query_key_factory';

type BulkByQuerySelection = Omit<BulkByQueryParams, 'force'>;

/**
 * ANDs an `enabled: true` clause into a by-query selection so only enabled
 * rules are targeted. Rotating a disabled rule's key is meaningless (it has no
 * executor task) and the server rejects it — scoping the query up front avoids
 * those per-rule errors for the common "select all" case.
 */
const scopeToEnabledRules = (query: BulkByQuerySelection): BulkByQuerySelection => {
  const enabledClause = 'enabled: true';
  if (query.match_all) {
    // `match_all` cannot be combined with `filter`, so swap it for the clause.
    const { match_all: _matchAll, ...rest } = query;
    return { ...rest, filter: enabledClause };
  }
  return {
    ...query,
    filter: query.filter ? `(${query.filter}) AND ${enabledClause}` : enabledClause,
  };
};

/** Dispatches to the by-ID or by-query update-api-key endpoint based on the selection mode. */
const dispatchUpdateApiKey = (rulesApi: RulesApi, params: BulkSelection): Promise<BulkResponse> => {
  if (params.mode === 'by_ids') {
    return rulesApi.bulkUpdateRuleApiKey({ ids: params.ids });
  }
  const { mode: _mode, ...query } = params;
  return rulesApi.updateRuleApiKeyByQuery({ ...scopeToEnabledRules(query), force: true });
};

/** Human-friendly, pluralized reason for a group of bulk errors sharing a `code`. */
const describeBulkErrorGroup = (code: string, count: number): string => {
  switch (code) {
    case 'RULE_DISABLED':
      return i18n.translate('xpack.alertingV2.hooks.useBulkUpdateRuleApiKey.reason.disabled', {
        defaultMessage: '{count, plural, one {# disabled rule} other {# disabled rules}}',
        values: { count },
      });
    case 'RULE_NOT_FOUND':
      return i18n.translate('xpack.alertingV2.hooks.useBulkUpdateRuleApiKey.reason.notFound', {
        defaultMessage: '{count, plural, one {# rule not found} other {# rules not found}}',
        values: { count },
      });
    case 'RULE_VERSION_CONFLICT':
      return i18n.translate(
        'xpack.alertingV2.hooks.useBulkUpdateRuleApiKey.reason.versionConflict',
        {
          defaultMessage:
            '{count, plural, one {# rule modified since it was loaded} other {# rules modified since they were loaded}}',
          values: { count },
        }
      );
    case 'RULE_ALREADY_RUNNING':
      return i18n.translate('xpack.alertingV2.hooks.useBulkUpdateRuleApiKey.reason.alreadyRunning', {
        defaultMessage:
          '{count, plural, one {# rule currently running (try again once it finishes)} other {# rules currently running (try again once they finish)}}',
        values: { count },
      });
    default:
      return i18n.translate('xpack.alertingV2.hooks.useBulkUpdateRuleApiKey.reason.other', {
        defaultMessage: '{count, plural, one {# rule failed} other {# rules failed}}',
        values: { count },
      });
  }
};

/**
 * Summarizes the per-rule errors of a partial bulk result into a short reason
 * breakdown grouped by error `code`, e.g. "2 disabled rules, 1 rule not found".
 * Groups by code (rather than listing every id) so the toast stays bounded.
 */
const summarizeBulkErrors = (errors: BulkResponse['errors']): string => {
  const countsByCode = new Map<string, number>();
  for (const { error } of errors) {
    countsByCode.set(error.code, (countsByCode.get(error.code) ?? 0) + 1);
  }
  return [...countsByCode.entries()]
    .map(([code, count]) => describeBulkErrorGroup(code, count))
    .join(', ');
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
        toasts.addWarning({
          title: i18n.translate(
            'xpack.alertingV2.hooks.useBulkUpdateRuleApiKey.partialSuccessMessage',
            {
              defaultMessage:
                'Update API key completed with {errorCount, plural, one {# error} other {# errors}}',
              values: { errorCount: data.errors.length },
            }
          ),
          text: summarizeBulkErrors(data.errors),
        });
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
