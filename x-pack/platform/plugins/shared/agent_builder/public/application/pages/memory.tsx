/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
  EuiTreeView,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { i18n } from '@kbn/i18n';
import React, { useCallback, useMemo, useState } from 'react';
import type { MemoryTreeNode } from '../../services/memory/memory_service';
import { useMemoryTree, useMemorySearch } from '../hooks/use_memory';
import { useNavigation } from '../hooks/use_navigation';
import { useBreadcrumb } from '../hooks/use_breadcrumbs';
import { appPaths } from '../utils/app_paths';

const toTreeItems = (
  nodes: MemoryTreeNode[],
  navigateFn: (path: string) => void
): Array<{
  id: string;
  label: React.ReactNode;
  children?: Array<{ id: string; label: React.ReactNode }>;
}> => {
  return nodes.map((node) => ({
    id: node.path,
    label: node.id ? (
      <EuiLink onClick={() => navigateFn(appPaths.memory.entry({ entryId: node.id! }))}>
        {node.title}
      </EuiLink>
    ) : (
      <EuiText size="s">{node.title}</EuiText>
    ),
    ...(node.children.length > 0 ? { children: toTreeItems(node.children, navigateFn) } : {}),
  }));
};

export const AgentBuilderMemoryPage: React.FC = () => {
  const { euiTheme } = useEuiTheme();
  const { navigateToAgentBuilderUrl } = useNavigation();
  const [searchQuery, setSearchQuery] = useState('');

  useBreadcrumb([
    {
      text: i18n.translate('xpack.agentBuilder.memory.breadcrumb', {
        defaultMessage: 'Memory',
      }),
      path: appPaths.memory.list,
    },
  ]);

  const { data: treeData, isLoading: isTreeLoading } = useMemoryTree();
  const { data: searchData, isLoading: isSearchLoading } = useMemorySearch(searchQuery);

  const treeItems = useMemo(() => {
    if (!treeData?.tree) return [];
    return toTreeItems(treeData.tree, navigateToAgentBuilderUrl);
  }, [treeData, navigateToAgentBuilderUrl]);

  const handleSearch = useCallback((value: string) => {
    setSearchQuery(value);
  }, []);

  const isSearchActive = searchQuery.length >= 2;

  return (
    <KibanaPageTemplate data-test-subj="agentBuilderMemoryPage">
      <KibanaPageTemplate.Header
        pageTitle={i18n.translate('xpack.agentBuilder.memory.title', {
          defaultMessage: 'Memory',
        })}
        description={i18n.translate('xpack.agentBuilder.memory.description', {
          defaultMessage:
            'A shared knowledge base for your agents. Browse, search, and manage memory entries that agents use to accumulate domain knowledge across conversations.',
        })}
        css={css`
          background-color: ${euiTheme.colors.backgroundBasePlain};
          border-block-end: none;
        `}
        rightSideItems={[
          <EuiButton
            key="new-entry-button"
            fill
            iconType="plus"
            onClick={() => navigateToAgentBuilderUrl(appPaths.memory.list)}
            data-test-subj="agentBuilderNewMemoryEntryButton"
          >
            <EuiText size="s">
              {i18n.translate('xpack.agentBuilder.memory.newEntryButton', {
                defaultMessage: 'New entry',
              })}
            </EuiText>
          </EuiButton>,
        ]}
      />
      <KibanaPageTemplate.Section>
        <EuiFieldSearch
          placeholder={i18n.translate('xpack.agentBuilder.memory.searchPlaceholder', {
            defaultMessage: 'Search memory entries...',
          })}
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          isClearable
          fullWidth
          data-test-subj="agentBuilderMemorySearch"
        />
        <EuiSpacer size="m" />

        {isSearchActive ? (
          isSearchLoading ? (
            <EuiLoadingSpinner size="l" />
          ) : (
            <EuiFlexGroup direction="column" gutterSize="s">
              {searchData?.results.map((result) => (
                <EuiFlexItem key={result.id}>
                  <EuiFlexGroup direction="column" gutterSize="xs">
                    <EuiFlexItem>
                      <EuiLink
                        onClick={() =>
                          navigateToAgentBuilderUrl(appPaths.memory.entry({ entryId: result.id }))
                        }
                      >
                        <strong>{result.title}</strong>
                      </EuiLink>
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <EuiText size="xs" color="subdued">
                        {result.path}
                      </EuiText>
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <EuiText size="s">{result.snippet}</EuiText>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
              ))}
              {searchData?.results.length === 0 && (
                <EuiText color="subdued">
                  {i18n.translate('xpack.agentBuilder.memory.noResults', {
                    defaultMessage: 'No memory entries found.',
                  })}
                </EuiText>
              )}
            </EuiFlexGroup>
          )
        ) : isTreeLoading ? (
          <EuiLoadingSpinner size="l" />
        ) : treeItems.length > 0 ? (
          <EuiTreeView
            items={treeItems}
            expandByDefault
            aria-label={i18n.translate('xpack.agentBuilder.memory.treeAriaLabel', {
              defaultMessage: 'Memory entries tree',
            })}
          />
        ) : (
          <EuiText color="subdued">
            {i18n.translate('xpack.agentBuilder.memory.empty', {
              defaultMessage:
                'No memory entries yet. Agents will automatically create entries as they learn, or you can create entries manually.',
            })}
          </EuiText>
        )}
      </KibanaPageTemplate.Section>
    </KibanaPageTemplate>
  );
};
