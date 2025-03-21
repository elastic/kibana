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
  EuiText,
} from '@elastic/eui';
import {
  StreamDefinition,
  isUnwiredStreamDefinition,
  isWiredStreamDefinition,
  isDslLifecycle,
  isInheritLifecycle,
} from '@kbn/streams-schema';
import { euiThemeVars } from '@kbn/ui-theme';
import { css } from '@emotion/css';
import { useStreamsAppRouter } from '../../hooks/use_streams_app_router';
import { asTrees, type StreamTree } from '../streams_list';
import { DocCountColumn } from './doc_count_column';
import { useKibana } from '../../hooks/use_kibana';
import { StreamsAppSearchBar, type StreamsAppSearchBarProps } from '../streams_app_search_bar';

export function StreamsTreeTable({
  loading,
  streams,
  onRefresh,
}: {
  loading?: boolean;
  streams: StreamDefinition[] | undefined;
  onRefresh?: StreamsAppSearchBarProps['onRefresh'];
}) {
  const router = useStreamsAppRouter();
  const {
    dependencies: {
      start: { data },
    },
  } = useKibana();
  const { timeRange, absoluteTimeRange, setTimeRange } =
    data.query.timefilter.timefilter.useTimefilter();

  const items = React.useMemo(() => flattenTrees(asTrees(streams ?? [])), [streams]);

  return (
    <EuiInMemoryTable
      loading={loading}
      columns={[
        {
          field: 'name',
          name: i18n.translate('xpack.streams.streamsTreeTableNameColumnName', {
            defaultMessage: 'Name',
          }),
          width: '50%',
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
          name: i18n.translate('xpack.streams.streamsTreeTableDocumentsColumnName', {
            defaultMessage: 'Documents',
          }),
          width: '25%',
          render: (_, item) => (
            <DocCountColumn
              indexPattern={item.name}
              start={absoluteTimeRange.start}
              end={absoluteTimeRange.end}
              numDataPoints={25}
            />
          ),
        },
        {
          field: 'retention',
          name: i18n.translate('xpack.streams.streamsTreeTableRetentionColumnName', {
            defaultMessage: 'Retention',
          }),
          width: '25%',
          render: (_, item) =>
            isWiredStreamDefinition(item.stream) || isUnwiredStreamDefinition(item.stream) ? (
              isInheritLifecycle(item.stream.ingest.lifecycle) ? (
                <EuiText color="subdued">
                  {i18n.translate('xpack.streams.streamsTreeTableRetentionColumnInheritedBadge', {
                    defaultMessage: 'Inherited',
                  })}
                </EuiText>
              ) : isDslLifecycle(item.stream.ingest.lifecycle) ? (
                item.stream.ingest.lifecycle.dsl.data_retention || (
                  <EuiIcon type="infinity" size="m" />
                )
              ) : (
                item.stream.ingest.lifecycle.ilm.policy
              )
            ) : null,
        },
      ]}
      itemId="name"
      items={items}
      pagination={true}
      search={{
        box: {
          incremental: true,
        },
        toolsRight: (
          <StreamsAppSearchBar
            onQuerySubmit={({ dateRange }, isUpdate) => {
              if (dateRange) {
                if (onRefresh && !isUpdate) {
                  onRefresh({ dateRange });
                } else {
                  setTimeRange(dateRange);
                }
              }
            }}
            onRefresh={onRefresh}
            dateRangeFrom={timeRange.from}
            dateRangeTo={timeRange.to}
            showSubmitButton={false}
          />
        ),
      }}
    />
  );
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
