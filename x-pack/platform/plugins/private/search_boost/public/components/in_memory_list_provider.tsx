/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React, { useEffect, useMemo } from 'react';
import useLatest from 'react-use/lib/useLatest';
import useUpdateEffect from 'react-use/lib/useUpdateEffect';
import type {
  ContentListItem,
  ContentListItemConfig,
  ContentListLabels,
  FieldDefinition,
  FindItemsParams,
} from '@kbn/content-list-provider';
import {
  contentListKeys,
  contentListQueryClient,
  useContentListPagination,
} from '@kbn/content-list-provider';
import { ContentListProvider } from '@kbn/content-list';
import { i18n } from '@kbn/i18n';

const PAGINATION = { initialPageSize: 10, pageSizeOptions: [10, 25, 50] };

type Matcher<T> = (item: T, params: FindItemsParams) => boolean;

const collator = new Intl.Collator(i18n.getLocale());

const compareValues = (a: unknown, b: unknown): number =>
  typeof a === 'number' && typeof b === 'number' ? a - b : collator.compare(String(a), String(b));

const useInMemoryDataSource = <T extends ContentListItem>(
  items: T[],
  queryKeyScope: string,
  matches: Matcher<T>
) => {
  const latest = useLatest({ items, matches });

  useUpdateEffect(() => {
    contentListQueryClient.invalidateQueries({ queryKey: contentListKeys.all(queryKeyScope) });
  }, [items, matches, queryKeyScope]);

  return useMemo(
    () => ({
      debounceMs: 0,
      findItems: async (params: FindItemsParams) => {
        const { sort, page } = params;
        const direction = sort?.direction === 'desc' ? -1 : 1;
        const field = sort?.field ?? 'title';
        const matched = latest.current.items
          .filter((item) => latest.current.matches(item, params))
          .sort(
            (a, b) =>
              compareValues(a[field], b[field]) * direction || collator.compare(a.title, b.title)
          );
        const start = page.index * page.size;
        return { items: matched.slice(start, start + page.size), total: matched.length };
      },
    }),
    [latest]
  );
};

const KeepPageInRange = () => {
  const { pageIndex, pageCount, setPageIndex } = useContentListPagination();
  useEffect(() => {
    if (pageCount > 0 && pageIndex >= pageCount) {
      setPageIndex(pageCount - 1);
    }
  }, [pageIndex, pageCount, setPageIndex]);
  return null;
};

export interface InMemoryListProviderProps<T extends ContentListItem> {
  /** Must keep its identity between renders, since a new array reloads the list. */
  items: T[];
  queryKeyScope: string;
  labels: ContentListLabels;
  /** Must keep its identity between renders, since a new function reloads the list. */
  matches: Matcher<T>;
  /** Must keep its identity between renders. */
  fields?: FieldDefinition[];
  initialSearch?: string;
  /** Leaving it out makes the list read only. */
  item?: ContentListItemConfig;
  children: ReactNode;
}

// The lists share their route, so none writes its state to the URL.
export const InMemoryListProvider = <T extends ContentListItem>({
  items,
  queryKeyScope,
  labels,
  matches,
  fields,
  initialSearch,
  item,
  children,
}: InMemoryListProviderProps<T>) => {
  const dataSource = useInMemoryDataSource(items, queryKeyScope, matches);
  const features = useMemo(
    () => ({
      urlSync: false,
      search: initialSearch ? { initialSearch } : true,
      pagination: PAGINATION,
      selection: false,
      ...(fields && { fields }),
    }),
    [initialSearch, fields]
  );

  return (
    <ContentListProvider
      queryKeyScope={queryKeyScope}
      labels={labels}
      dataSource={dataSource}
      features={features}
      item={item}
      isReadOnly={!item}
    >
      <KeepPageInRange />
      {children}
    </ContentListProvider>
  );
};
