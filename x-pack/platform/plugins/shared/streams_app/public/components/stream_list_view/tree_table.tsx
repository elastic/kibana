/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useState, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiIcon,
  EuiInMemoryTable,
  Direction,
  Criteria,
} from '@elastic/eui';
import { euiThemeVars } from '@kbn/ui-theme';
import { css } from '@emotion/css';
import { isRootStreamDefinition, getSegments, isDescendantOf, Streams } from '@kbn/streams-schema';
import type { ListStreamDetail } from '@kbn/streams-plugin/server/routes/internal/streams/crud/route';
import { isDslLifecycle, isIlmLifecycle } from '@kbn/streams-schema';
import { StreamsAppSearchBar } from '../streams_app_search_bar';
import { DocumentsColumn } from './documents_column';
import { useStreamsAppRouter } from '../../hooks/use_streams_app_router';
import { RetentionColumn } from './retention_column';
import { parseDurationInSeconds } from '../data_management/stream_detail_lifecycle/helpers';
import { useKibana } from '../../hooks/use_kibana';
import { useTimefilter } from '../../hooks/use_timefilter';
import { StreamsListEmptyState } from './streams_list_empty_state';

export function StreamsTreeTable({
  loading,
  streams,
}: {
  streams: ListStreamDetail[] | undefined;
  loading?: boolean;
}) {
  const router = useStreamsAppRouter();

  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();

  const { timeState } = useTimefilter();

  const [docCounts, setDocCounts] = useState<Record<string, number>>({});

  const streamNames = React.useMemo(() => (streams ?? []).map((s) => s.stream.name), [streams]);

  useEffect(() => {
    if (streamNames.length === 0) return;

    let cancelled = false;
    const fetchCounts = async () => {
      const counts: Record<string, number> = {};
      await Promise.all(
        streamNames.map(async (name) => {
          try {
            const startStr = String(timeState.start);
            const endStr = String(timeState.end);

            const { details } = await streamsRepositoryClient.fetch(
              'GET /internal/streams/{name}/_details',
              {
                params: {
                  path: { name },
                  query: { start: startStr, end: endStr },
                },
                signal: null,
              }
            );
            counts[name] = details?.count ?? 0;
          } catch {
            counts[name] = 0;
          }
        })
      );
      if (!cancelled) {
        setDocCounts(counts);
      }
    };

    fetchCounts();
    return () => {
      cancelled = true;
    };
  }, [streamNames, timeState, streamsRepositoryClient]);

  type SortableField = 'name' | 'documentsCount' | 'retentionMs';
  const [sortField, setSortField] = useState<SortableField>('name');
  const [sortDirection, setSortDirection] = useState<Direction>('asc');

  const items = React.useMemo(
    () =>
      flattenTrees(asTrees(streams ?? [])).map((item) => {
        const documentsCount = docCounts[item.name] ?? 0;
        let retentionMs = 0;
        const lc = item.effective_lifecycle;
        if (isDslLifecycle(lc)) {
          retentionMs = parseDurationInSeconds(lc.dsl.data_retention ?? '') * 1000;
        } else if (isIlmLifecycle(lc)) {
          retentionMs = Number.POSITIVE_INFINITY;
        }
        return {
          ...item,
          documentsCount,
          retentionMs,
        };
      }),
    [streams, docCounts]
  );

  const onTableChange = useCallback(({ sort }: Criteria<any>) => {
    if (sort) {
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

  if (!loading && items.length === 0) {
    return <StreamsListEmptyState onAddData={() => {}} />;
  }

  return (
    <EuiInMemoryTable
      loading={loading}
      columns={[
        {
          field: 'name',
          name: i18n.translate('xpack.streams.streamsTreeTable.nameColumnName', {
            defaultMessage: 'Name',
          }),
          sortable: true,
          dataType: 'string',
          render: (name: StreamTreeWithLevel['name'], item) => (
            <EuiFlexGroup
              alignItems="center"
              gutterSize="s"
              responsive={false}
              className={css`
                margin-left: ${item.level * parseInt(euiThemeVars.euiSizeXL, 10)}px;
              `}
            >
              <EuiFlexItem grow={false}>
                {item.children.length > 0 ? (
                  <EuiIcon type="arrowDown" color="primary" size="s" />
                ) : (
                  <EuiIcon type="empty" color="primary" size="s" />
                )}
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiLink
                  data-test-subj="streamsAppStreamNodeLink"
                  href={router.link('/{key}', { path: { key: name } })}
                >
                  {name}
                </EuiLink>
              </EuiFlexItem>
            </EuiFlexGroup>
          ),
        },
        {
          field: 'documents',
          name: i18n.translate('xpack.streams.streamsTreeTable.documentsColumnName', {
            defaultMessage: 'Documents',
          }),
          width: '280px',
          sortable: true,
          dataType: 'number',
          render: (_: any, item: any) =>
            item.data_stream ? (
              <DocumentsColumn indexPattern={item.name} numDataPoints={25} />
            ) : null,
        },
        {
          field: 'effective_lifecycle',
          name: i18n.translate('xpack.streams.streamsTreeTable.retentionColumnName', {
            defaultMessage: 'Retention',
          }),
          width: '160px',
          align: 'left',
          sortable: true,
          dataType: 'number',
          render: (_: any, item: any) => <RetentionColumn lifecycle={item.effective_lifecycle} />,
        },
      ]}
      itemId="name"
      items={items}
      sorting={sorting}
      message={i18n.translate('xpack.streams.streamsTreeTable.noStreamsMessage', {
        defaultMessage: 'Loading streams...',
      })}
      onChange={onTableChange}
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

export interface StreamTree extends ListStreamDetail {
  name: string;
  type: 'wired' | 'root' | 'classic';
  children: StreamTree[];
}

export function asTrees(streams: ListStreamDetail[]) {
  const trees: StreamTree[] = [];
  const sortedStreams = streams
    .slice()
    .sort((a, b) => getSegments(a.stream.name).length - getSegments(b.stream.name).length);

  sortedStreams.forEach((streamDetail) => {
    let currentTree = trees;
    let existingNode: StreamTree | undefined;
    // traverse the tree following the prefix of the current name.
    // once we reach the leaf, the current name is added as child - this works because the ids are sorted by depth
    while (
      (existingNode = currentTree.find((node) =>
        isDescendantOf(node.name, streamDetail.stream.name)
      ))
    ) {
      currentTree = existingNode.children;
    }

    if (!existingNode) {
      const newNode: StreamTree = {
        ...streamDetail,
        name: streamDetail.stream.name,
        children: [],
        type: Streams.UnwiredStream.Definition.is(streamDetail.stream)
          ? 'classic'
          : isRootStreamDefinition(streamDetail.stream)
          ? 'root'
          : 'wired',
      };
      currentTree.push(newNode);
    }
  });

  return trees;
}

interface StreamTreeWithLevel extends StreamTree {
  level: number;
}

function flattenTrees(trees: StreamTree[], level = 0) {
  return trees.reduce<StreamTreeWithLevel[]>((acc: StreamTreeWithLevel[], tree: StreamTree) => {
    acc.push({ ...tree, level });
    if (tree.children.length) {
      acc.push(...flattenTrees(tree.children, level + 1));
    }
    return acc;
  }, []);
}
