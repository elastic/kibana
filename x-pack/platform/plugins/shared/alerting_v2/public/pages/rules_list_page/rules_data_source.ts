/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useService } from '@kbn/core-di-browser';
import { i18n } from '@kbn/i18n';
import { CoreStart } from '@kbn/core-di-browser';
import type { ContentListItem, DataSourceConfig } from '@kbn/content-list';
import type { FindRulesSortField } from '@kbn/alerting-v2-schemas';
import { RULES_CONTENT_LIST_ID } from '../../constants';
import type { RuleApiResponse } from '../../services/rules_api';
import { RulesApi } from '../../services/rules_api';
import { toFindRulesRequest } from '../../hooks/use_fetch_rules';
import { toRulesQueryParams } from './rules_query_params';

export { RULES_CONTENT_LIST_ID };

export type RuleContentListItem = ContentListItem & {
  rule: RuleApiResponse;
};

const SORT_FIELDS = new Set<FindRulesSortField>(['kind', 'enabled', 'name']);

/**
 * Maps Content List sort fields onto {@link FindRulesSortField}.
 * `Column.Name` sorts by `title`; the rules API expects `name`.
 */
const toApiSortField = (field: string | undefined): FindRulesSortField | undefined => {
  if (!field) {
    return undefined;
  }
  if (field === 'title') {
    return 'name';
  }
  if (SORT_FIELDS.has(field as FindRulesSortField)) {
    return field as FindRulesSortField;
  }
  return undefined;
};

const toContentListItem = (rule: RuleApiResponse): RuleContentListItem => ({
  id: rule.id,
  title: rule.metadata?.name ?? rule.id,
  description: rule.metadata?.description ?? undefined,
  tags: rule.metadata?.tags ?? undefined,
  createdBy: rule.created_by ?? undefined,
  updatedBy: rule.updated_by ?? undefined,
  updatedAt: rule.updated_at ? new Date(rule.updated_at) : undefined,
  rule,
});

export const useRulesDataSource = (): DataSourceConfig => {
  const rulesApi = useService(RulesApi);
  const { toasts } = useService(CoreStart('notifications'));

  return useMemo(
    (): DataSourceConfig => ({
      findItems: async ({ filters, sort, page }) => {
        const { filter, search } = toRulesQueryParams(filters);

        try {
          const response = await rulesApi.listRules(
            toFindRulesRequest({
              page: page.index + 1,
              perPage: page.size,
              filter,
              search,
              sortField: toApiSortField(sort?.field),
              sortOrder: sort?.direction,
            })
          );

          return {
            items: response.items.map(toContentListItem),
            total: response.total,
          };
        } catch (error) {
          toasts.addError(error, {
            title: i18n.translate('xpack.alertingV2.rulesList.fetchError', {
              defaultMessage: 'Failed to load rules',
            }),
          });
          throw error;
        }
      },
    }),
    [rulesApi, toasts]
  );
};
