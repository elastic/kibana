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

const API_SORT_FIELDS = ['name', 'tags'] as const;
type ApiSortField = (typeof API_SORT_FIELDS)[number];

/** Classic find rejects `per_page` above 100. */
const CLASSIC_FIND_PAGE_SIZE = 100;

const isApiSortField = (field: string): field is ApiSortField =>
  (API_SORT_FIELDS as readonly string[]).includes(field);

/**
 * Maps Content List sort fields onto the classic find API.
 * `Column.Name` sorts by `title`; the templates API expects `name`.
 */
const toApiSortField = (field: string | undefined): ApiSortField | undefined => {
  if (!field) {
    return undefined;
  }
  if (field === 'title') {
    return 'name';
  }
  if (isApiSortField(field)) {
    return field;
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

const hasExcludedTag = (template: RuleTemplate, excludedTags: ReadonlySet<string>): boolean =>
  template.tags.some((tag) => excludedTags.has(tag));

export const useV1RuleTemplatesDataSource = (): DataSourceConfig => {
  const http = useService(CoreStart('http'));
  const { toasts } = useService(CoreStart('notifications'));

  const findItems = useCallback<DataSourceConfig['findItems']>(
    async ({ searchQuery, filters, sort, page }) => {
      const tagFilter = filters[TAG_FILTER_ID] as IncludeExcludeFilter | undefined;
      const tags = tagFilter?.include?.length ? tagFilter.include : undefined;
      const excludedTags = tagFilter?.exclude ?? [];
      const search = searchQuery || undefined;
      const sortField = toApiSortField(sort?.field);
      const sortOrder = sort?.direction;

      try {
        if (excludedTags.length === 0) {
          const response = await findRuleTemplates({
            http,
            page: page.index + 1,
            perPage: page.size,
            search,
            tags,
            sortField,
            sortOrder,
          });

          return {
            items: response.data.map(toV1RuleTemplateContentListItem),
            total: response.total,
          };
        }

        // Classic find accepts included tags only, so exclusions are applied after every page is loaded.
        const excluded = new Set(excludedTags);
        const matches: RuleTemplate[] = [];
        let apiPage = 1;
        let pageCount = 1;
        while (apiPage <= pageCount) {
          const response = await findRuleTemplates({
            http,
            page: apiPage,
            perPage: CLASSIC_FIND_PAGE_SIZE,
            search,
            tags,
            sortField,
            sortOrder,
          });
          if (apiPage === 1) {
            pageCount = Math.max(1, Math.ceil(response.total / CLASSIC_FIND_PAGE_SIZE));
          }
          matches.push(...response.data.filter((template) => !hasExcludedTag(template, excluded)));
          if (response.data.length === 0) {
            break;
          }
          apiPage += 1;
        }

        const start = page.index * page.size;
        return {
          items: matches.slice(start, start + page.size).map(toV1RuleTemplateContentListItem),
          total: matches.length,
        };
      } catch (error) {
        const normalizedError = error instanceof Error ? error : new Error(String(error));
        toasts.addError(normalizedError, {
          title: i18n.translate('xpack.alertingV2.ruleLibrary.v1.fetchError', {
            defaultMessage: 'Failed to load rule templates',
          }),
        });
        throw normalizedError;
      }
    },
    [http, toasts]
  );

  return useMemo(() => ({ findItems }), [findItems]);
};
