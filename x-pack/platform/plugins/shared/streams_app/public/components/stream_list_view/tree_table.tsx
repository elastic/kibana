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
import { getSegments } from '@kbn/streams-schema';
import { isDslLifecycle, isIlmLifecycle } from '@kbn/streams-schema';
import type { ListStreamDetail } from '@kbn/streams-plugin/server/routes/internal/streams/crud/route';
import { StreamTree, asTrees } from './utils';
import { StreamsAppSearchBar } from '../streams_app_search_bar';
import { DocumentsColumn } from './documents_column';
import { useStreamsAppRouter } from '../../hooks/use_streams_app_router';
import { RetentionColumn } from './retention_column';
import { parseDurationInSeconds } from '../data_management/stream_detail_lifecycle/helpers';

interface EnrichedStreamTree extends Omit<StreamTree, 'children'> {
  children: EnrichedStreamTree[];
  nameSortKey: string;
  documentsCount: number;
  retentionMs: number;
}
type TableRow = EnrichedStreamTree & {
  level: number;
  rootNameSortKey: string;
  rootDocumentsCount: number;
  rootRetentionMs: number;
};
export function StreamsTreeTable({
  loading,
  streams,
}: {
  streams: ListStreamDetail[] | undefined;
  loading?: boolean;
}) {
  const router = useStreamsAppRouter();
  const { euiTheme } = useEuiTheme();

  type SortableField = 'nameSortKey' | 'retentionMs';
  const [sortField, setSortField] = useState<SortableField>('nameSortKey');
  const [sortDirection, setSortDirection] = useState<Direction>('asc');

  const enrichedTree = React.useMemo(() => {
    const enrich = (node: StreamTree): EnrichedStreamTree => {
      let retentionMs = 0;
      const lc = node.effective_lifecycle;
      if (isDslLifecycle(lc)) {
        retentionMs = parseDurationInSeconds(lc.dsl.data_retention ?? '') * 1000;
      } else if (isIlmLifecycle(lc)) {
        retentionMs = Number.POSITIVE_INFINITY;
      }
      const nameSortKey = `${getSegments(node.name).length}_${node.name.toLowerCase()}`;
      return {
        ...node,
        nameSortKey,
        documentsCount: 0,
        retentionMs,
        children: node.children.map(enrich),
      } as EnrichedStreamTree;
    };
    return asTrees(streams ?? []).map(enrich);
  }, [streams]);

  const items = React.useMemo(() => {
    if (!enrichedTree.length) return [];

    const compare = (a: EnrichedStreamTree, b: EnrichedStreamTree) => {
      const av = a[sortField];
      const bv = b[sortField];
      if (typeof av === 'string' && typeof bv === 'string') {
        return sortDirection === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      if (typeof av === 'number' && typeof bv === 'number') {
        return sortDirection === 'asc' ? av - bv : bv - av;
      }
      return 0;
    };

    const shouldSortChildren = sortField === 'nameSortKey' || sortField === 'retentionMs';

    const result: TableRow[] = [];

    const pushNode = (
      node: EnrichedStreamTree,
      level: number,
      rootMeta: Pick<TableRow, 'rootNameSortKey' | 'rootDocumentsCount' | 'rootRetentionMs'>
    ) => {
      result.push({ ...node, level, ...rootMeta });

      const children = shouldSortChildren ? [...node.children].sort(compare) : node.children;
      children.forEach((child) => pushNode(child, level + 1, rootMeta));
    };

    [...enrichedTree].sort(compare).forEach((root) => {
      const rootMeta = {
        rootNameSortKey: root.nameSortKey,
        rootDocumentsCount: root.documentsCount,
        rootRetentionMs: root.retentionMs,
      } as const;
      pushNode(root, 0, rootMeta);
    });

    return result;
  }, [enrichedTree, sortField, sortDirection]);

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
            >
              <EuiFlexItem grow={false}>
                {item.children.length > 0 ? (
                  <EuiIcon type="arrowDown" color="text" size="m" />
                ) : (
                  <EuiIcon type="empty" color="text" size="m" />
                )}
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiLink
                  data-test-subj="streamsAppStreamNodeLink"
                  href={router.link('/{key}', { path: { key: item.name } })}
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
        },
        toolsRight: <StreamsAppSearchBar showDatePicker />,
      }}
    />
  );
}
