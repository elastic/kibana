/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import { CoreStart, useService } from '@kbn/core-di-browser';
import { i18n } from '@kbn/i18n';
import type { ContentListItem, DataSourceConfig } from '@kbn/content-list';
import type { IncludeExcludeFilter } from '@kbn/content-list-provider';
import { TAG_FILTER_ID } from '@kbn/content-list-provider';
import type { RuleTemplateResponse } from '@kbn/alerting-v2-schemas';
import { RuleTemplatesApi } from '../../services/rule_templates_api';

export type RuleTemplateContentListItem = ContentListItem & {
  template: RuleTemplateResponse;
};

const toContentListItem = (template: RuleTemplateResponse): RuleTemplateContentListItem => ({
  id: template.id,
  title: template.metadata.name,
  description: template.metadata.description,
  tags: template.metadata.tags && template.metadata.tags.length > 0 ? template.metadata.tags : undefined,
  template,
});

export const useRuleTemplatesDataSource = (): DataSourceConfig => {
  const ruleTemplatesApi = useService(RuleTemplatesApi);
  const { toasts } = useService(CoreStart('notifications'));

  const findItems = useCallback<DataSourceConfig['findItems']>(
    async ({ searchQuery, filters, sort, page }) => {
      const tagFilter = filters[TAG_FILTER_ID] as IncludeExcludeFilter | undefined;

      try {
        const response = await ruleTemplatesApi.findRuleTemplates({
          page: page.index + 1,
          perPage: page.size,
          search: searchQuery || undefined,
          tags: tagFilter?.include,
          sortField:
            sort?.field === 'name' || sort?.field === 'tags' ? sort.field : undefined,
          sortOrder: sort?.direction,
        });

        return {
          items: response.items.map(toContentListItem),
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
