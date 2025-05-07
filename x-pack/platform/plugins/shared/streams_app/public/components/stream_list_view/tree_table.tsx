/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiFlexItem, EuiLink, EuiIcon, EuiInMemoryTable } from '@elastic/eui';
import { euiThemeVars } from '@kbn/ui-theme';
import { css } from '@emotion/css';
import { isRootStreamDefinition, getSegments, isDescendantOf, Streams } from '@kbn/streams-schema';
import type { ListStreamDetail } from '@kbn/streams-plugin/server/routes/internal/streams/crud/route';
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
  const items = React.useMemo(() => flattenTrees(asTrees(streams ?? [])), [streams]);

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
            item.data_stream ? (
              <DocumentsColumn indexPattern={item.name} numDataPoints={25} />
            ) : null,
        },
        {
          field: 'effective_lifecycle',
          name: i18n.translate('xpack.streams.streamsTreeTable.retentionColumnName', {
            defaultMessage: 'Retention',
          }),
          width: '20%',
          render: (_, item) => <RetentionColumn lifecycle={item.effective_lifecycle} />,
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
