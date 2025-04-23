/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiIcon,
  EuiInMemoryTable,
  EuiBadge,
  EuiToolTip,
} from '@elastic/eui';
import { euiThemeVars } from '@kbn/ui-theme';
import { css } from '@emotion/css';
import {
  isRootStreamDefinition,
  isUnwiredStreamDefinition,
  getSegments,
  isDescendantOf,
} from '@kbn/streams-schema';
import type { ListStreamDetail } from '@kbn/streams-plugin/server/routes/internal/streams/crud/route';
import { StreamsAppSearchBar } from '../streams_app_search_bar';
import { DocumentsColumn } from './documents_column';
import { useStreamsAppRouter } from '../../hooks/use_streams_app_router';
import { RetentionColumn } from './retention_column';
import { useTimeFilter } from '../../hooks/use_timefilter';

export function StreamsTreeTable({
  loading,
  streams,
}: {
  streams: ListStreamDetail[] | undefined;
  loading?: boolean;
}) {
  const router = useStreamsAppRouter();
  const items = React.useMemo(() => flattenTrees(asTrees(streams ?? [])), [streams]);
  const { timeRange, setTimeRange, refreshAbsoluteTimeRange } = useTimeFilter();

  return (
    <EuiInMemoryTable
      loading={loading}
      columns={[
        {
          field: 'name',
          name: i18n.translate('xpack.streams.streamsTreeTable.nameColumnName', {
            defaultMessage: 'Name',
          }),
          width: '40%',
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
              <EuiFlexItem grow={false}>
                <EuiToolTip content={item.definitions.map((d) => d.server).join(', ')}>
                  <EuiBadge>{item.definitions.length}</EuiBadge>
                </EuiToolTip>
              </EuiFlexItem>
            </EuiFlexGroup>
          ),
        },
        {
          field: 'documents',
          name: i18n.translate('xpack.streams.streamsTreeTable.documentsColumnName', {
            defaultMessage: 'Documents',
          }),
          width: '40%',
          render: (_, item) =>
            item.definitions.some((d) => d.data_stream) ? (
              <DocumentsColumn stream={item} numDataPoints={25} />
            ) : null,
        },
        {
          field: 'effective_lifecycle',
          name: i18n.translate('xpack.streams.streamsTreeTable.retentionColumnName', {
            defaultMessage: 'Retention',
          }),
          width: '20%',
          render: (_, item) => <RetentionColumn stream={item} />,
        },
      ]}
      itemId="name"
      items={items}
      pagination={{
        initialPageSize: 25,
        pageSizeOptions: [25, 50, 100],
      }}
      search={{
        box: {
          incremental: true,
        },
        toolsRight: (
          <StreamsAppSearchBar
            onQuerySubmit={({ dateRange }, isUpdate) => {
              if (dateRange) {
                setTimeRange(dateRange);
                if (!isUpdate) {
                  refreshAbsoluteTimeRange();
                }
              }
            }}
            onRefresh={refreshAbsoluteTimeRange}
            dateRangeFrom={timeRange.from}
            dateRangeTo={timeRange.to}
          />
        ),
      }}
    />
  );
}

export interface StreamTree {
  name: string;
  type: 'wired' | 'root' | 'classic';
  definitions: ListStreamDetail[];
  children: StreamTree[];
}

function mergeStreams(streams: ListStreamDetail[]) {
  const mergedStreams: Record<string, { name: string; definitions: ListStreamDetail[] }> = {};
  streams.forEach((stream) => {
    if (!mergedStreams[stream.stream.name]) {
      mergedStreams[stream.stream.name] = { name: stream.stream.name, definitions: [stream] };
    } else {
      mergedStreams[stream.stream.name].definitions.push(stream);
    }
  });
  return Object.values(mergedStreams);
}

export function asTrees(streams: ListStreamDetail[]) {
  const trees: StreamTree[] = [];
  const sortedStreams = mergeStreams(streams)
    .slice()
    .sort((a, b) => getSegments(a.name).length - getSegments(b.name).length);

  sortedStreams.forEach((streamDetail) => {
    let currentTree = trees;
    let existingNode: StreamTree | undefined;
    // traverse the tree following the prefix of the current name.
    // once we reach the leaf, the current name is added as child - this works because the ids are sorted by depth
    while (
      (existingNode = currentTree.find((node) => isDescendantOf(node.name, streamDetail.name)))
    ) {
      currentTree = existingNode.children;
    }

    if (!existingNode) {
      const newNode: StreamTree = {
        ...streamDetail,
        name: streamDetail.name,
        children: [],
        type: isUnwiredStreamDefinition(streamDetail.definitions[0].stream)
          ? 'classic'
          : isRootStreamDefinition(streamDetail.definitions[0].stream)
          ? 'root'
          : 'wired',
      };
      currentTree.push(newNode);
    }
  });

  return trees;
}

export interface StreamTreeWithLevel extends StreamTree {
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
