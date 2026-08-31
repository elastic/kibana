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
  ActionPolicyResponse,
  FindActionPoliciesRequest,
  FindActionPoliciesSortField,
} from '@kbn/alerting-v2-schemas';
import { ActionPoliciesApi } from '../../services/action_policies_api';
import { assertAllFieldsMapped, type Complete } from '../../mapper_types';

/** Filter dimension key for the enabled/disabled state filter. */
export const ENABLED_FILTER_ID = 'enabled';

export interface FindActionPoliciesUiParams {
  page?: number;
  perPage?: number;
  search?: string;
  tags?: string[];
  enabled?: boolean;
  sortField?: FindActionPoliciesSortField;
  sortOrder?: 'asc' | 'desc';
}

export const toFindActionPoliciesRequest = ({
  page,
  perPage,
  search,
  tags,
  enabled,
  sortField,
  sortOrder,
  ...rest
}: FindActionPoliciesUiParams): Complete<FindActionPoliciesRequest> => {
  assertAllFieldsMapped(rest);
  return {
    page,
    per_page: perPage,
    search,
    tags,
    enabled,
    sort_field: sortField,
    sort_order: sortOrder,
  };
};

export type ActionPolicyContentListItem = ContentListItem & {
  policy: ActionPolicyResponse;
};

const toContentListItem = (policy: ActionPolicyResponse): ActionPolicyContentListItem => ({
  id: policy.id,
  title: policy.name,
  tags: policy.tags ?? undefined,
  createdBy: policy.created_by ?? undefined,
  updatedBy: policy.updated_by ?? undefined,
  updatedAt: policy.updated_at ? new Date(policy.updated_at) : undefined,
  policy,
});

export const useActionPoliciesDataSource = (): DataSourceConfig => {
  const actionPoliciesApi = useService(ActionPoliciesApi);
  const { toasts } = useService(CoreStart('notifications'));

  const findItems = useCallback<DataSourceConfig['findItems']>(
    async ({ searchQuery, filters, sort, page }) => {
      const tagFilter = filters[TAG_FILTER_ID] as IncludeExcludeFilter | undefined;
      const enabledFilter = filters[ENABLED_FILTER_ID] as IncludeExcludeFilter | undefined;

      let enabled: boolean | undefined;
      if (enabledFilter?.include?.length === 1) {
        if (enabledFilter.include[0] === 'enabled') enabled = true;
        else if (enabledFilter.include[0] === 'disabled') enabled = false;
      }

      try {
        const response = await actionPoliciesApi.listActionPolicies(
          toFindActionPoliciesRequest({
            page: page.index + 1,
            perPage: page.size,
            search: searchQuery || undefined,
            tags: tagFilter?.include,
            enabled,
            sortField: sort?.field as FindActionPoliciesSortField | undefined,
            sortOrder: sort?.direction,
          })
        );

        return {
          items: response.items.map(toContentListItem),
          total: response.total,
        };
      } catch (error) {
        toasts.addError(error, {
          title: i18n.translate('xpack.alertingV2.actionPolicies.fetchError', {
            defaultMessage: 'Failed to load action policies',
          }),
        });
        return { items: [], total: 0 };
      }
    },
    [actionPoliciesApi, toasts]
  );

  return useMemo(() => ({ findItems }), [findItems]);
};
