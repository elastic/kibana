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
import type { ActiveFilters } from '@kbn/content-list-provider';
import type { ImportResponse, ImportStatsItem, ImportStatus } from '@kbn/alerting-v2-schemas';
import { IMPORT_STATUSES } from '@kbn/alerting-v2-schemas';
import { ImportsApi } from '../../services/imports_api';

/** Filter dimension key for the status filter. */
export const IMPORT_STATUS_FILTER_ID = 'status';

/** POC: an import joined with its stats. Stats are missing when the stats call failed. */
export interface ImportListItem {
  import: ImportResponse;
  stats?: ImportStatsItem;
}

export type ImportContentListItem = ContentListItem & { importItem: ImportListItem };

export const isImportContentListItem = (item: ContentListItem): item is ImportContentListItem =>
  'importItem' in item;

const isImportStatus = (value: string): value is ImportStatus =>
  IMPORT_STATUSES.some((status) => status === value);

const getIncludedStatuses = (value: ActiveFilters[string]): ImportStatus[] =>
  value != null && typeof value === 'object' && 'include' in value
    ? (value.include ?? []).filter(isImportStatus)
    : [];

/** Page size of the server call. Imports are few, so the whole list is joined and paged here. */
const SERVER_PER_PAGE = 100;

export const toImportContentListItem = (importItem: ImportListItem): ImportContentListItem => ({
  id: importItem.import.id,
  title: importItem.import.name,
  description: importItem.import.description,
  createdBy: importItem.import.created_by?.profile_uid ?? undefined,
  updatedBy: importItem.import.updated_by?.profile_uid ?? undefined,
  updatedAt: new Date(importItem.import.updated_at),
  importItem,
});

export const joinImportsWithStats = (
  imports: ImportResponse[],
  stats: ImportStatsItem[]
): ImportListItem[] => {
  const statsById = new Map(stats.map((item) => [item.id, item]));
  return imports.map((item) => ({ import: item, stats: statsById.get(item.id) }));
};

export const useImportsDataSource = (): DataSourceConfig => {
  const importsApi = useService(ImportsApi);
  const { toasts } = useService(CoreStart('notifications'));

  const findItems = useCallback<DataSourceConfig['findItems']>(
    async ({ searchQuery, filters, page }) => {
      const statuses = getIncludedStatuses(filters[IMPORT_STATUS_FILTER_ID]);

      try {
        // One list call and one stats call per load, joined by id.
        const [list, stats] = await Promise.all([
          importsApi.listImports({ per_page: SERVER_PER_PAGE, search: searchQuery || undefined }),
          importsApi.getImportStats().catch((error) => {
            toasts.addError(error, {
              title: i18n.translate('xpack.alertingV2.imports.statsError', {
                defaultMessage: 'Failed to load import status',
              }),
            });
            return { items: [] };
          }),
        ]);

        const joined = joinImportsWithStats(list.items, stats.items).filter(
          (item) => statuses.length === 0 || (item.stats && statuses.includes(item.stats.status))
        );
        const start = page.index * page.size;

        return {
          items: joined.slice(start, start + page.size).map(toImportContentListItem),
          total: joined.length,
        };
      } catch (error) {
        toasts.addError(error, {
          title: i18n.translate('xpack.alertingV2.imports.fetchError', {
            defaultMessage: 'Failed to load imports',
          }),
        });
        return { items: [], total: 0 };
      }
    },
    [importsApi, toasts]
  );

  return useMemo(() => ({ findItems }), [findItems]);
};
