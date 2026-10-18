/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef, useState } from 'react';
import { i18n } from '@kbn/i18n';
import type { TanStackDatatableGridProps } from './types';

interface UseGridAnnouncementsParams {
  columns: TanStackDatatableGridProps['columns'];
  sorting: TanStackDatatableGridProps['sorting'];
  pageIndex?: number;
  pageCount: number;
}

/**
 * The message for a screen reader live region, which announces changes the grid makes to what
 * it shows: sorting and paging. Nothing is announced for the initial state.
 */
export const useGridAnnouncements = ({
  columns,
  sorting,
  pageIndex,
  pageCount,
}: UseGridAnnouncementsParams) => {
  const [message, setMessage] = useState('');
  const previous = useRef({ pageIndex, sortKey: undefined as string | undefined });

  const sort = sorting?.columns[0];
  const sortKey = sort ? `${sort.id}:${sort.direction}` : '';
  const sortedColumn = sort && columns.find((column) => column.id === sort.id);
  const sortedColumnName = sortedColumn?.displayAsText ?? sort?.id;

  useEffect(() => {
    const { pageIndex: previousPageIndex, sortKey: previousSortKey } = previous.current;
    previous.current = { pageIndex, sortKey };

    if (previousSortKey !== undefined && previousSortKey !== sortKey) {
      setMessage(
        sort
          ? i18n.translate('xpack.lens.table.tanstackGrid.sortedAnnouncement', {
              defaultMessage: 'Sorted by {column}, {direction}',
              values: {
                column: sortedColumnName,
                direction:
                  sort.direction === 'asc'
                    ? i18n.translate('xpack.lens.table.tanstackGrid.ascending', {
                        defaultMessage: 'ascending',
                      })
                    : i18n.translate('xpack.lens.table.tanstackGrid.descending', {
                        defaultMessage: 'descending',
                      }),
              },
            })
          : i18n.translate('xpack.lens.table.tanstackGrid.sortRemovedAnnouncement', {
              defaultMessage: 'Sorting removed',
            })
      );
    } else if (previousPageIndex !== undefined && pageIndex !== previousPageIndex) {
      setMessage(
        i18n.translate('xpack.lens.table.tanstackGrid.pageAnnouncement', {
          defaultMessage: 'Page {page} of {pageCount}',
          values: { page: (pageIndex ?? 0) + 1, pageCount },
        })
      );
    }
  }, [pageIndex, pageCount, sort, sortKey, sortedColumnName]);

  return message;
};
