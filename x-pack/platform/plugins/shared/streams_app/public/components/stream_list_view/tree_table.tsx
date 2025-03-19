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

export function StreamsTreeTable({
  loading,
  streams,
}: {
  loading?: boolean;
  streams: StreamDefinition[] | undefined;
}) {
  const router = useStreamsAppRouter();
  const {
    dependencies: {
      start: { data },
    },
  } = useKibana();
  const {
    absoluteTimeRange: { start, end },
  } = data.query.timefilter.timefilter.useTimefilter();

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
              {item.type === 'classic' ? (
                <EuiFlexItem grow={false}>
                  <EuiBadge color="hollow">
                    {i18n.translate('xpack.streams.streamsTreeTableClassicBadge', {
                      defaultMessage: 'Classic',
                    })}
                  </EuiBadge>
                </EuiFlexItem>
              ) : null}
            </EuiFlexGroup>
          ),
        },
        {
          field: 'documents',
          name: i18n.translate('xpack.streams.streamsTreeTableDocumentsColumnName', {
            defaultMessage: 'Documents',
          }),
          nameTooltip: {
            content: `Number of documents from ${start} to ${end}`,
          },
          width: '25%',
          render: (_, item) => (
            <DocCountColumn indexPattern={item.name} start={start} end={end} numDataPoints={20} />
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
      pagination={{
        initialPageSize: 30,
        pageSizeOptions: [3, 30],
      }}
      searchFormat="text"
      search={{
        box: {
          incremental: true,
        },
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
