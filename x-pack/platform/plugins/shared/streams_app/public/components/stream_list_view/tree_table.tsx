/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState } from 'react';
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
  EuiSearchBarProps,
  EuiHighlight,
} from '@elastic/eui';
import { css } from '@emotion/css';
import type { ListStreamDetail } from '@kbn/streams-plugin/server/routes/internal/streams/crud/route';
import { isEmpty } from 'lodash';
import {
  buildStreamRows,
  TableRow,
  SortableField,
  asTrees,
  enrichStream,
  shouldComposeTree,
} from './utils';
import { StreamsAppSearchBar } from '../streams_app_search_bar';
import { DocumentsColumn } from './documents_column';
import { useStreamsAppRouter } from '../../hooks/use_streams_app_router';
import { RetentionColumn } from './retention_column';

export function StreamsTreeTable({
  loading,
  streams = [],
}: {
  streams?: ListStreamDetail[];
  loading?: boolean;
}) {
  const router = useStreamsAppRouter();
  const { euiTheme } = useEuiTheme();

  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortableField>('nameSortKey');
  const [sortDirection, setSortDirection] = useState<Direction>('asc');

  const enrichedStreams = React.useMemo(() => {
    const streamList = shouldComposeTree(sortField, searchQuery) ? asTrees(streams) : streams;
    return streamList.map(enrichStream);
  }, [sortField, searchQuery, streams]);

  const items = React.useMemo(
    () => buildStreamRows(enrichedStreams, sortField, sortDirection),
    [enrichedStreams, sortField, sortDirection]
  );

  const handleQueryChange: EuiSearchBarProps['onChange'] = ({ query }) => {
    if (query) setSearchQuery(query.text);
  };

  const handleTableChange = ({ sort }: Criteria<TableRow>) => {
    if (sort) {
      setSortField(sort.field as SortableField);
      setSortDirection(sort.direction);
    }
  };

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
            >
              {item.children && (
                <EuiFlexItem grow={false}>
                  {isEmpty(item.children) ? (
                    <EuiIcon type="empty" color="text" size="m" />
                  ) : (
                    <EuiIcon type="arrowDown" color="text" size="m" />
                  )}
                </EuiFlexItem>
              )}
              <EuiFlexItem grow={false}>
                <EuiLink
                  data-test-subj="streamsAppStreamNodeLink"
                  href={router.link('/{key}', { path: { key: item.stream.name } })}
                >
                  <EuiHighlight search={searchQuery}>{item.stream.name}</EuiHighlight>
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
              <DocumentsColumn indexPattern={item.stream.name} numDataPoints={25} />
            ) : null,
        },
        {
          field: 'retentionMs',
          name: i18n.translate('xpack.streams.streamsTreeTable.retentionColumnName', {
            defaultMessage: 'Retention',
          }),
          width: '160px',
          align: 'left',
          sortable: (row: TableRow) => row.rootRetentionMs,
          dataType: 'number',
          render: (_: unknown, item: TableRow) => (
            <RetentionColumn lifecycle={item.effective_lifecycle} />
          ),
        },
      ]}
      itemId="name"
      items={items}
      sorting={sorting}
      noItemsMessage={i18n.translate('xpack.streams.streamsTreeTable.noStreamsMessage', {
        defaultMessage: 'No streams found.',
      })}
      onTableChange={handleTableChange}
      pagination={{
        initialPageSize: 25,
        pageSizeOptions: [25, 50, 100],
      }}
      search={{
        query: searchQuery,
        onChange: handleQueryChange,
        box: {
          incremental: true,
        },
        toolsRight: <StreamsAppSearchBar showDatePicker />,
      }}
    />
  );
}
