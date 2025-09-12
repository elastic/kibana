/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import type { Direction, Criteria, EuiSearchBarProps } from '@elastic/eui';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiIcon,
  EuiInMemoryTable,
  useEuiTheme,
  EuiHighlight,
} from '@elastic/eui';
import { css } from '@emotion/css';
import type { ListStreamDetail } from '@kbn/streams-plugin/server/routes/internal/streams/crud/route';
import { isEmpty } from 'lodash';
import { Streams } from '@kbn/streams-schema';
import type { TableRow, SortableField } from './utils';
import { buildStreamRows, asTrees, enrichStream, shouldComposeTree } from './utils';
import { StreamsAppSearchBar } from '../streams_app_search_bar';
import { DocumentsColumn } from './documents_column';
import { DataQualityColumn } from './data_quality_column';
import { useStreamsAppRouter } from '../../hooks/use_streams_app_router';
import { useStreamsAppFetch } from '../../hooks/use_streams_app_fetch';
import { useKibana } from '../../hooks/use_kibana';
import { useTimefilter } from '../../hooks/use_timefilter';
import { esqlResultToTimeseries } from '../../util/esql_result_to_timeseries';
import { RetentionColumn } from './retention_column';
import {
  NAME_COLUMN_HEADER,
  RETENTION_COLUMN_HEADER,
  STREAMS_TABLE_SEARCH_ARIA_LABEL,
  STREAMS_TABLE_CAPTION_ARIA_LABEL,
  RETENTION_COLUMN_HEADER_ARIA_LABEL,
  NO_STREAMS_MESSAGE,
  DATA_QUALITY_COLUMN_HEADER,
  DOCUMENTS_COLUMN_HEADER,
} from './translations';
import { DiscoverBadgeButton } from '../stream_badges';

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
    const ingestStreams = streams.filter((stream) =>
      Streams.ingest.all.Definition.is(stream.stream)
    );
    const streamList = shouldComposeTree(sortField, searchQuery)
      ? asTrees(ingestStreams)
      : ingestStreams;
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
          name: NAME_COLUMN_HEADER,
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
                    <EuiIcon type="empty" color="text" size="m" aria-hidden="true" />
                  ) : (
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
          name: DOCUMENTS_COLUMN_HEADER,
          width: '180px',
          sortable: false,
          align: 'right',
          dataType: 'number',
          render: (_: unknown, item: TableRow) =>
            item.data_stream ? (
              <DocumentsColumn indexPattern={item.stream.name} numDataPoints={25} />
            ) : null,
        },
        {
          field: 'dataQiulity',
          name: DATA_QUALITY_COLUMN_HEADER,
          width: '150px',
          sortable: false,
          dataType: 'number',
          render: (_: unknown, item: TableRow) =>
            item.data_stream ? (
              <DataQualityColumn
                indexPattern={item.stream.name}
                considerFailedQuality={
                  item.can_read_failure_store && item.data_stream?.failure_store?.enabled
                }
                numDataPoints={25}
              />
            ) : null,
        },
        {
          field: 'retentionMs',
          name: (
            <span aria-label={RETENTION_COLUMN_HEADER_ARIA_LABEL}>{RETENTION_COLUMN_HEADER}</span>
          ),
          align: 'left',
          sortable: (row: TableRow) => row.rootRetentionMs,
          dataType: 'number',
          width: '220px',
          render: (_: unknown, item: TableRow) => (
            <RetentionColumn
              lifecycle={item.effective_lifecycle!}
              aria-label={i18n.translate('xpack.streams.streamsTreeTable.retentionCellAriaLabel', {
                defaultMessage: 'Retention policy for {name}',
                values: { name: item.stream.name },
              })}
            />
          ),
        },
        {
          field: 'definition',
          name: 'Actions',
          width: '60px',
          align: 'left',
          sortable: false,
          dataType: 'string',
          render: (_: unknown, item: TableRow) => (
            <DiscoverBadgeButton
              definition={
                {
                  stream: item.stream,
                  data_stream_exists: !!item.data_stream,
                } as Streams.ingest.all.GetResponse
              }
            />
          ),
        },
      ]}
      itemId="name"
      items={items}
      sorting={sorting}
      noItemsMessage={NO_STREAMS_MESSAGE}
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
          'aria-label': STREAMS_TABLE_SEARCH_ARIA_LABEL,
        },
        toolsRight: <StreamsAppSearchBar showDatePicker />,
      }}
      tableCaption={STREAMS_TABLE_CAPTION_ARIA_LABEL}
    />
  );
}
