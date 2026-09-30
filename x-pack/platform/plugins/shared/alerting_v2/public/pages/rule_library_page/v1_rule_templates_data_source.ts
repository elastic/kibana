/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import { useService, CoreStart } from '@kbn/core-di-browser';
import { i18n } from '@kbn/i18n';
import type { ContentListItem, DataSourceConfig } from '@kbn/content-list';
import { TAG_FILTER_ID } from '@kbn/content-list-provider';
import type { IncludeExcludeFilter } from '@kbn/content-list-provider';
import {
  findRuleTemplates,
  type RuleTemplate,
} from '@kbn/response-ops-rules-apis/apis/find_rule_templates';

const SORT_FIELDS = new Set(['name', 'tags']);

/**
 * Maps Content List sort fields onto the classic find API.
 * `Column.Name` sorts by `title`; the templates API expects `name`.
 */
const toApiSortField = (field: string | undefined): 'name' | 'tags' | undefined => {
  if (!field) {
    return undefined;
  }
  if (field === 'title') {
    return 'name';
  }
  if (SORT_FIELDS.has(field)) {
    return field as 'name' | 'tags';
  }
  return undefined;
};

export type V1RuleTemplateContentListItem = ContentListItem & {
  template: RuleTemplate;
};

export const toV1RuleTemplateContentListItem = (
  template: RuleTemplate
): V1RuleTemplateContentListItem => ({
  id: template.id,
  title: template.name,
  description: template.description,
  tags: template.tags.length > 0 ? template.tags : undefined,
  template,
});

export const useV1RuleTemplatesDataSource = (): DataSourceConfig => {
  const http = useService(CoreStart('http'));
  const { toasts } = useService(CoreStart('notifications'));

  const findItems = useCallback<DataSourceConfig['findItems']>(
    async ({ searchQuery, filters, sort, page }) => {
      const tagFilter = filters[TAG_FILTER_ID] as IncludeExcludeFilter | undefined;
      const tags = tagFilter?.include?.length ? tagFilter.include : undefined;

      try {
        const response = await findRuleTemplates({
          http,
          page: page.index + 1,
          perPage: page.size,
          search: searchQuery || undefined,
          tags,
          sortField: toApiSortField(sort?.field),
          sortOrder: sort?.direction,
        });

        return {
          items: response.data.map(toV1RuleTemplateContentListItem),
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
    [http, toasts]
  );

  return useMemo(() => ({ findItems }), [findItems]);
};
