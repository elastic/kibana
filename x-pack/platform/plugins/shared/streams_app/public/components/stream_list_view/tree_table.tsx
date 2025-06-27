/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiIcon,
  EuiInMemoryTable,
  Direction,
  Criteria,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/css';
import type { ListStreamDetail } from '@kbn/streams-plugin/server/routes/internal/streams/crud/route';
import { buildStreamRows, TableRow, SortableField } from './utils';
import { StreamsAppSearchBar } from '../streams_app_search_bar';
import { DocumentsColumn } from './documents_column';
import { useStreamsAppRouter } from '../../hooks/use_streams_app_router';
import { RetentionColumn } from './retention_column';

export function StreamsTreeTable({
  loading,
  streams,
}: {
  streams: ListStreamDetail[] | undefined;
  loading?: boolean;
}) {
  const router = useStreamsAppRouter();
  const { euiTheme } = useEuiTheme();

  const [sortField, setSortField] = useState<SortableField>('nameSortKey');
  const [sortDirection, setSortDirection] = useState<Direction>('asc');

  const items = React.useMemo(
    () => buildStreamRows(streams ?? [], sortField, sortDirection),
    [streams, sortField, sortDirection]
  );

  const onTableChange = useCallback(({ sort }: Criteria<TableRow>) => {
    if (sort && (sort.field === 'nameSortKey' || sort.field === 'retentionMs')) {
      setSortField(sort.field as SortableField);
      setSortDirection(sort.direction);
    }
  }, []);

  const sorting = {
    sort: {
      field: sortField,
      direction: sortDirection,
    },
  };

  return (
    <EuiInMemoryTable<TableRow>
      loading={loading}
      columns={[
        {
          field: 'nameSortKey',
          name: i18n.translate('xpack.streams.streamsTreeTable.nameColumnName', {
            defaultMessage: 'Name',
          }),
          sortable: (row: TableRow) => row.rootNameSortKey,
          dataType: 'string',
          render: (_: unknown, item: TableRow) => (
            <EuiFlexGroup
              alignItems="center"
              gutterSize="s"
              responsive={false}
              className={css`
                margin-left: ${item.level * parseInt(euiTheme.size.xl, 10)}px;
              `}
              aria-label={i18n.translate('xpack.streams.streamsTreeTable.nameColumnAriaLabel', {
                defaultMessage: 'Stream name: {name}, level {level}',
                values: { name: item.name, level: item.level },
              })}
            >
              <EuiFlexItem grow={false}>
                {item.children.length > 0 ? (
                  <EuiIcon
                    type="arrowDown"
                    color="text"
                    size="m"
                    aria-label={i18n.translate(
                      'xpack.streams.streamsTreeTable.expandedNodeAriaLabel',
                      {
                        defaultMessage: 'Expanded node with {childCount} children',
                        values: { childCount: item.children.length },
                      }
                    )}
                  />
                ) : (
                  <EuiIcon type="empty" color="text" size="m" aria-hidden="true" />
                )}
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiLink
                  data-test-subj="streamsAppStreamNodeLink"
                  href={router.link('/{key}', { path: { key: item.name } })}
                  aria-label={i18n.translate('xpack.streams.streamsTreeTable.streamLinkAriaLabel', {
                    defaultMessage: 'View details for stream {name}',
                    values: { name: item.name },
                  })}
                >
                  {item.name}
                </EuiLink>
              </EuiFlexItem>
            </EuiFlexGroup>
          ),
        },
        {
          field: 'documentsCount',
          name: (
            <span
              className={css`
                margin-right: ${euiTheme.size.l};
              `}
              role="columnheader"
              tabIndex={0}
              aria-label={i18n.translate(
                'xpack.streams.streamsTreeTable.documentsColumnHeaderAriaLabel',
                {
                  defaultMessage:
                    'Documents column - shows document count and chart data for each stream',
                }
              )}
            >
              {i18n.translate('xpack.streams.streamsTreeTable.documentsColumnName', {
                defaultMessage: 'Documents',
              })}
            </span>
          ),
          width: '280px',
          sortable: false,
          dataType: 'number',
          render: (_: unknown, item: TableRow) =>
            item.data_stream ? (
              <DocumentsColumn indexPattern={item.name} numDataPoints={25} />
            ) : null,
        },
        {
          field: 'retentionMs',
          name: (
            <span
              role="columnheader"
              aria-label={i18n.translate(
                'xpack.streams.streamsTreeTable.retentionColumnHeaderAriaLabel',
                {
                  defaultMessage:
                    'Retention column - shows data retention policies for each stream',
                }
              )}
            >
              {i18n.translate('xpack.streams.streamsTreeTable.retentionColumnName', {
                defaultMessage: 'Retention',
              })}
            </span>
          ),
          width: '160px',
          align: 'left',
          sortable: (row: TableRow) => row.rootRetentionMs,
          dataType: 'number',
          render: (_: unknown, item: TableRow) => (
            <RetentionColumn
              lifecycle={item.effective_lifecycle}
              aria-label={i18n.translate('xpack.streams.streamsTreeTable.retentionCellAriaLabel', {
                defaultMessage: 'Retention policy for {name}',
                values: { name: item.name },
              })}
            />
          ),
        },
      ]}
      itemId="name"
      items={items}
      sorting={sorting}
      message={i18n.translate('xpack.streams.streamsTreeTable.noStreamsMessage', {
        defaultMessage: 'Loading streams...',
      })}
      onTableChange={onTableChange}
      pagination={{
        initialPageSize: 25,
        pageSizeOptions: [25, 50, 100],
      }}
      search={{
        box: {
          incremental: true,
          'aria-label': i18n.translate('xpack.streams.streamsTreeTable.searchAriaLabel', {
            defaultMessage: 'Search streams by name',
          }),
        },
        toolsRight: <StreamsAppSearchBar showDatePicker />,
      }}
      tableCaption={i18n.translate('xpack.streams.streamsTreeTable.tableCaptionAriaLabel', {
        defaultMessage:
          'Streams data table showing stream names, document counts with charts, and retention policies. Use Tab to navigate between columns and Enter to interact with elements.',
      })}
      rowProps={(item: TableRow) => ({
        'aria-label': i18n.translate('xpack.streams.streamsTreeTable.rowAriaLabel', {
          defaultMessage: 'Stream row for {name}',
          values: { name: item.name },
        }),
      })}
    />
  );
}
