/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import { useService } from '@kbn/core-di-browser';
import { i18n } from '@kbn/i18n';
import { CoreStart } from '@kbn/core-di-browser';
import type { ContentListItem, DataSourceConfig } from '@kbn/content-list';
import { TAG_FILTER_ID } from '@kbn/content-list-provider';
import type { IncludeExcludeFilter } from '@kbn/content-list-provider';
import type {
  FindRuleTemplatesRequest,
  FindRuleTemplatesSortField,
  RuleTemplateResponse,
} from '@kbn/alerting-v2-schemas';
import { RuleTemplatesApi } from '../../services/rule_templates_api';
import { assertAllFieldsMapped, type Complete } from '../../mapper_types';

export { RULE_TEMPLATES_CONTENT_LIST_ID } from '../../constants';

export interface FindRuleTemplatesUiParams {
  page?: number;
  perPage?: number;
  search?: string;
  tags?: string[];
  sortField?: FindRuleTemplatesSortField;
  sortOrder?: 'asc' | 'desc';
}

export const toFindRuleTemplatesRequest = ({
  page,
  perPage,
  search,
  tags,
  sortField,
  sortOrder,
  ...rest
}: FindRuleTemplatesUiParams): Complete<FindRuleTemplatesRequest> => {
  assertAllFieldsMapped(rest);
  return {
    page,
    per_page: perPage,
    search,
    tags,
    sort_field: sortField,
    sort_order: sortOrder,
  };
};

export type RuleTemplateContentListItem = ContentListItem & {
  template: RuleTemplateResponse;
};

const SORT_FIELDS = new Set<FindRuleTemplatesSortField>(['name', 'tags']);

/**
 * Maps Content List sort fields onto {@link FindRuleTemplatesSortField}.
 * `Column.Name` sorts by `title`; the templates API expects `name`.
 */
const toApiSortField = (field: string | undefined): FindRuleTemplatesSortField | undefined => {
  if (!field) {
    return undefined;
  }
  if (field === 'title') {
    return 'name';
  }
  if (SORT_FIELDS.has(field as FindRuleTemplatesSortField)) {
    return field as FindRuleTemplatesSortField;
  }
  return undefined;
};

export const toRuleTemplateContentListItem = (
  template: RuleTemplateResponse
): RuleTemplateContentListItem => ({
  id: template.id,
  title: template.rule.metadata.name,
  description: template.rule.metadata.description ?? undefined,
  tags: template.rule.metadata.tags ?? undefined,
  template,
});

export const useRuleTemplatesDataSource = (): DataSourceConfig => {
  const ruleTemplatesApi = useService(RuleTemplatesApi);
  const { toasts } = useService(CoreStart('notifications'));

  const findItems = useCallback<DataSourceConfig['findItems']>(
    async ({ searchQuery, filters, sort, page }) => {
      const tagFilter = filters[TAG_FILTER_ID] as IncludeExcludeFilter | undefined;

      try {
        const response = await ruleTemplatesApi.listRuleTemplates(
          toFindRuleTemplatesRequest({
            page: page.index + 1,
            perPage: page.size,
            search: searchQuery || undefined,
            tags: tagFilter?.include,
            sortField: toApiSortField(sort?.field),
            sortOrder: sort?.direction,
          })
        );

        return {
          items: response.items.map(toRuleTemplateContentListItem),
          total: response.total,
        };
      } catch (error) {
        toasts.addError(error, {
          title: i18n.translate('xpack.alertingV2.ruleLibrary.fetchError', {
            defaultMessage: 'Failed to load rule templates',
          }),
        });
        return { items: [], total: 0 };
      }
    },
    [ruleTemplatesApi, toasts]
  );

  return useMemo(() => ({ findItems }), [findItems]);
};
