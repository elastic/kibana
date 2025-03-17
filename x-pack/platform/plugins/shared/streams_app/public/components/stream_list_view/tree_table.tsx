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
  EuiBadge,
  EuiI18nNumber,
  EuiNotificationBadge,
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
import { useStreamsAppFetch } from '../../hooks/use_streams_app_fetch';
import { asTrees, type StreamTree } from '../streams_list';
import { ColumnChart } from './column_chart';
import { useKibana } from '../../hooks/use_kibana';

export function StreamsTreeTable({
  loading,
  streams,
}: {
  loading?: boolean;
  streams: StreamDefinition[] | undefined;
}) {
  const router = useStreamsAppRouter();

  // const [query, setQuery] = useState('');
  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({});

  const items = React.useMemo(
    () => flattenTrees(asTrees(streams ?? []), collapsed),
    [streams, collapsed]
  );

  return (
    <EuiInMemoryTable
      loading={loading}
      columns={[
        {
          field: 'name',
          name: 'Name',
          width: '40%',
          render: (name: StreamTreeWithLevel['name'], item) => (
            <EuiFlexGroup
              className={css`
                margin-left: ${item.level * parseInt(euiThemeVars.euiSizeXL, 10)}px;
              `}
              alignItems="center"
              gutterSize="s"
            >
              <EuiFlexItem grow={false}>
                {item.children.length > 0 ? (
                  // TODO: We can either have pagination or expand/collapse, not both
                  // <button
                  //   type="button"
                  //   onClick={() => {
                  //     setCollapsed({ ...collapsed, [item.name]: !collapsed?.[item.name] });
                  //   }}
                  // >
                  // </button>
                  <EuiIcon
                    type={collapsed[item.name] ? 'arrowRight' : 'arrowDown'}
                    color="primary"
                    size="s"
                  />
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
                  <EuiBadge color="hollow">Classic</EuiBadge>
                </EuiFlexItem>
              ) : collapsed[item.name] && item.children.length ? (
                <EuiFlexItem grow={false}>
                  <EuiNotificationBadge color="subdued">
                    {item.children.length}
                  </EuiNotificationBadge>
                </EuiFlexItem>
              ) : null}
            </EuiFlexGroup>
          ),
        },
        // {
        //   field: 'type',
        //   name: 'Type',
        //   render: (type: StreamTreeWithLevel['type']) =>
        //     type === 'root' ? (
        //       <EuiBadge color="hollow">Root</EuiBadge>
        //     ) : type === 'classic' ? (
        //       <EuiBadge color="hollow">Classic</EuiBadge>
        //     ) : null,
        // },
        {
          field: 'size',
          name: 'Documents',
          width: '20%',
          render: (_, item) => {
            return (
              <EuiFlexGroup alignItems="center" gutterSize="m">
                <EuiFlexItem grow={false}>
                  <EuiI18nNumber value={Math.ceil(Math.random() * 100000)} />
                </EuiFlexItem>
                <EuiFlexItem>
                  <ColumnChart />
                </EuiFlexItem>
              </EuiFlexGroup>
            );
          },
        },
        {
          field: 'retention',
          name: 'Retention',
          width: '20%',
          render: (_, item) =>
            isWiredStreamDefinition(item.stream) || isUnwiredStreamDefinition(item.stream) ? (
              isInheritLifecycle(item.stream.ingest.lifecycle) ? (
                <EuiText color="subdued">Inherited</EuiText>
              ) : isDslLifecycle(item.stream.ingest.lifecycle) ? (
                item.stream.ingest.lifecycle.dsl.data_retention || (
                  <EuiIcon type="infinity" size="s" />
                )
              ) : (
                item.stream.ingest.lifecycle.ilm.policy
              )
            ) : null,
        },
      ]}
      items={items}
      pagination={{
        initialPageSize: 30,
        pageSizeOptions: [3, 30],
      }}
    />
  );
}

interface StreamTreeWithLevel extends StreamTree {
  level: number;
}

function flattenTrees(trees: StreamTree[], collapsed: Record<string, boolean>, level = 0) {
  return trees.reduce<StreamTreeWithLevel[]>((acc: StreamTreeWithLevel[], tree: StreamTree) => {
    acc.push({ ...tree, level });
    if (!collapsed[tree.name]) {
      acc.push(...flattenTrees(tree.children, collapsed, level + 1));
    }
    return acc;
  }, []);
}
