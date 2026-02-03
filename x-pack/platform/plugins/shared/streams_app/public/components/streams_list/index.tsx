/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiSwitch,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useMemo } from 'react';
import { euiThemeVars } from '@kbn/ui-theme';
import { css } from '@emotion/css';
import {
  Streams,
  getSegments,
  isDescendantOf,
  isRootStreamDefinition,
  getDiscoverEsqlQuery,
} from '@kbn/streams-schema';
import type { estypes } from '@elastic/elasticsearch';
import { useStreamsAppRouter } from '../../hooks/use_streams_app_router';
import { NestedView } from '../nested_view';
import { useKibana } from '../../hooks/use_kibana';

export interface StreamListItem {
  stream: Streams.all.Definition;
  data_stream?: estypes.IndicesDataStream;
}

export interface StreamTree {
  name: string;
  type: 'wired' | 'root' | 'classic';
  stream: Streams.all.Definition;
  data_stream?: estypes.IndicesDataStream;
  children: StreamTree[];
}

export function asTrees(items: StreamListItem[]) {
  const trees: StreamTree[] = [];
  const sortedItems = items
    .slice()
    .sort((a, b) => getSegments(a.stream.name).length - getSegments(b.stream.name).length);

  sortedItems.forEach((item) => {
    let currentTree = trees;
    let existingNode: StreamTree | undefined;
    // traverse the tree following the prefix of the current name.
    // once we reach the leaf, the current name is added as child - this works because the ids are sorted by depth
    while (
      (existingNode = currentTree.find((node) => isDescendantOf(node.name, item.stream.name)))
    ) {
      currentTree = existingNode.children;
    }

    if (!existingNode) {
      const newNode: StreamTree = {
        name: item.stream.name,
        children: [],
        stream: item.stream,
        data_stream: item.data_stream,
        type: Streams.ClassicStream.Definition.is(item.stream)
          ? 'classic'
          : isRootStreamDefinition(item.stream)
          ? 'root'
          : 'wired',
      };
      currentTree.push(newNode);
    }
  });

  return trees;
}

export function StreamsList({
  streams,
  query,
  showControls,
}: {
  streams: StreamListItem[] | undefined;
  query?: string;
  showControls: boolean;
}) {
  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({});
  const [showClassic, setShowClassic] = React.useState(true);
  const items = useMemo(() => {
    return streams ?? [];
  }, [streams]);

  const filteredItems = useMemo(() => {
    return items
      .filter((item) => showClassic || Streams.WiredStream.Definition.is(item.stream))
      .filter((item) => !query || item.stream.name.toLowerCase().includes(query.toLowerCase()));
  }, [query, items, showClassic]);

  const treeView = useMemo(() => asTrees(filteredItems), [filteredItems]);

  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      {showControls && (
        <>
          <EuiTitle size="xxs">
            <h2>
              {i18n.translate('xpack.streams.streamsTable.tableTitle', {
                defaultMessage: 'Streams',
              })}
            </h2>
          </EuiTitle>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="m" justifyContent="spaceBetween">
              {Object.keys(collapsed).length === 0 ? (
                <EuiButtonEmpty
                  data-test-subj="streamsAppStreamsListCollapseAllButton"
                  iconType="fold"
                  size="s"
                  onClick={() =>
                    setCollapsed(Object.fromEntries(items.map((item) => [item.stream.name, true])))
                  }
                >
                  {i18n.translate('xpack.streams.streamsTable.collapseAll', {
                    defaultMessage: 'Collapse all',
                  })}
                </EuiButtonEmpty>
              ) : (
                <EuiButtonEmpty
                  data-test-subj="streamsAppStreamsListExpandAllButton"
                  iconType="unfold"
                  onClick={() => setCollapsed({})}
                  size="s"
                >
                  {i18n.translate('xpack.streams.streamsTable.expandAll', {
                    defaultMessage: 'Expand all',
                  })}
                </EuiButtonEmpty>
              )}
              <EuiSwitch
                label={i18n.translate('xpack.streams.streamsTable.showClassicStreams', {
                  defaultMessage: 'Show classic streams',
                })}
                compressed
                checked={showClassic}
                onChange={(e) => setShowClassic(e.target.checked)}
              />
            </EuiFlexGroup>
          </EuiFlexItem>
        </>
      )}
      <EuiFlexItem grow={false}>
        {treeView.map((tree) => (
          <StreamNode
            key={tree.name}
            node={tree}
            collapsed={collapsed}
            setCollapsed={setCollapsed}
          />
        ))}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

function StreamNode({
  node,
  collapsed,
  setCollapsed,
}: {
  node: StreamTree;
  collapsed: Record<string, boolean>;
  setCollapsed: (collapsed: Record<string, boolean>) => void;
}) {
  const router = useStreamsAppRouter();
  const {
    dependencies: {
      start: { share },
    },
  } = useKibana();
  const discoverLocator = useMemo(
    () => share.url.locators.get('DISCOVER_APP_LOCATOR'),
    [share.url.locators]
  );

  const discoverUrl = useMemo(() => {
    if (!discoverLocator) {
      return undefined;
    }

    // Use index_mode from data_stream (from listing data)
    const esqlQuery = getDiscoverEsqlQuery({
      definition: node.stream,
      indexMode: node.data_stream?.index_mode,
    });

    if (!esqlQuery) {
      return undefined;
    }

    return discoverLocator.getRedirectUrl({
      query: {
        esql: esqlQuery,
      },
    });
  }, [discoverLocator, node]);

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="xs"
      className={css`
        margin-top: ${euiThemeVars.euiSizeXS};
        margin-left: ${euiThemeVars.euiSizeS};
      `}
    >
      <EuiFlexGroup
        direction="row"
        gutterSize="s"
        alignItems="center"
        className={css`
          padding: ${euiThemeVars.euiSizeXS};
          border-radius: ${euiThemeVars.euiBorderRadius};
          &:hover {
            background-color: ${euiThemeVars.euiColorLightestShade};
            .links {
              opacity: 1;
            }
          }
        `}
      >
        {node.children.length > 0 && (
          // Using a regular button here instead of the EUI one to control styling
          <button
            type="button"
            onClick={() => {
              setCollapsed?.({ ...collapsed, [node.name]: !collapsed?.[node.name] });
            }}
            className={css`
              background: none;
              margin-left: -${euiThemeVars.euiSizeXS};
              margin-right: ${euiThemeVars.euiSizeXS};
            `}
          >
            <EuiIcon type={collapsed?.[node.name] ? 'arrowRight' : 'arrowDown'} />
          </button>
        )}
        <EuiLink
          data-test-subj="streamsAppStreamNodeLink"
          color="text"
          href={router.link('/{key}', { path: { key: node.name } })}
        >
          {node.name}
        </EuiLink>
        {node.type === 'root' && (
          <EuiBadge color="hollow">
            <EuiIcon type="branch" size="s" />
          </EuiBadge>
        )}
        {node.type === 'classic' && (
          <EuiBadge color="hollow">
            <EuiIcon type="bullseye" size="s" />
          </EuiBadge>
        )}
        <EuiFlexGroup
          className={`links ${css`
            opacity: 0;
          `}`}
          alignItems="center"
          gutterSize="s"
        >
          <EuiToolTip
            content={i18n.translate('xpack.streams.streamsTable.openInNewTab', {
              defaultMessage: 'Open in new tab',
            })}
            disableScreenReaderOutput
          >
            <EuiButtonIcon
              data-test-subj="streamsAppStreamNodeButton"
              aria-label={i18n.translate('xpack.streams.streamsTable.openInNewTab', {
                defaultMessage: 'Open in new tab',
              })}
              iconType="popout"
              target="_blank"
              href={router.link('/{key}', { path: { key: node.name } })}
            />
          </EuiToolTip>
          <EuiToolTip
            content={i18n.translate('xpack.streams.streamsTable.openInDiscover', {
              defaultMessage: 'Open in Discover',
            })}
            disableScreenReaderOutput
          >
            <EuiButtonIcon
              data-test-subj="streamsAppStreamNodeButton"
              iconType="discoverApp"
              href={discoverUrl}
              aria-label={i18n.translate('xpack.streams.streamsTable.openInDiscover', {
                defaultMessage: 'Open in Discover',
              })}
            />
          </EuiToolTip>
          <EuiToolTip
            content={i18n.translate('xpack.streams.streamsTable.management', {
              defaultMessage: 'Management',
            })}
            disableScreenReaderOutput
          >
            <EuiButtonIcon
              data-test-subj="streamsAppStreamNodeButton"
              iconType="gear"
              aria-label={i18n.translate('xpack.streams.streamsTable.management', {
                defaultMessage: 'Management',
              })}
              href={router.link('/{key}/management/{tab}', {
                path: { key: node.name, tab: 'partitioning' },
              })}
            />
          </EuiToolTip>
        </EuiFlexGroup>
      </EuiFlexGroup>
      {node.children.length > 0 && !collapsed?.[node.name] && (
        <EuiFlexItem>
          <EuiFlexGroup direction="column" gutterSize="xs">
            {node.children.map((child, index) => (
              <NestedView
                key={child.name}
                last={index === node.children.length - 1}
                first={index === 0}
              >
                <StreamNode node={child} collapsed={collapsed} setCollapsed={setCollapsed} />
              </NestedView>
            ))}
          </EuiFlexGroup>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
}
