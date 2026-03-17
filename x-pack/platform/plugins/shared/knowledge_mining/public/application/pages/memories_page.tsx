/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  EuiPageHeader,
  EuiPageSection,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTreeView,
  EuiPanel,
  EuiText,
  EuiFieldSearch,
  EuiSpacer,
  EuiButtonEmpty,
  EuiCodeBlock,
  EuiBadge,
  EuiEmptyPrompt,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { Memory } from '../../../common/types';

interface TreeNode {
  id: string;
  label: string;
  isExpanded?: boolean;
  children?: TreeNode[];
  memoryId?: string;
}

const buildTree = (memories: Memory[]): TreeNode[] => {
  const root: Record<string, TreeNode> = {};

  for (const memory of memories) {
    const parts = memory.path.split('/');
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLeaf = i === parts.length - 1;

      if (!current[part]) {
        current[part] = {
          id: isLeaf ? memory.id : parts.slice(0, i + 1).join('/'),
          label: part,
          children: isLeaf ? undefined : [],
          memoryId: isLeaf ? memory.id : undefined,
        };
      }

      if (!isLeaf) {
        const childMap: Record<string, TreeNode> = {};
        for (const child of current[part].children ?? []) {
          childMap[child.label] = child;
        }
        current = childMap;
      }
    }
  }

  const toArray = (map: Record<string, TreeNode>): TreeNode[] => {
    return Object.values(map).map((node) => ({
      ...node,
      children: node.children
        ? toArray(Object.fromEntries((node.children ?? []).map((c) => [c.label, c])))
        : undefined,
    }));
  };

  return toArray(root);
};

export const MemoriesPage = () => {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchMemories = useCallback(async () => {
    setLoading(true);
    try {
      const query = searchQuery ? `?query=${encodeURIComponent(searchQuery)}` : '';
      const response = await fetch(`/api/knowledge_mining/memories${query}`);
      const data = await response.json();
      setMemories(data.results);
    } catch {
      setMemories([]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    fetchMemories();
  }, [fetchMemories]);

  const handleSelectMemory = async (memoryId: string) => {
    try {
      const response = await fetch(`/api/knowledge_mining/memories/${memoryId}`);
      const data = await response.json();
      setSelectedMemory(data);
    } catch {
      setSelectedMemory(null);
    }
  };

  const handleDelete = async () => {
    if (!selectedMemory) return;
    await fetch(`/api/knowledge_mining/memories/${selectedMemory.id}`, { method: 'DELETE' });
    setSelectedMemory(null);
    fetchMemories();
  };

  const treeItems = buildTree(memories);

  return (
    <>
      <EuiPageHeader
        pageTitle={i18n.translate('xpack.knowledgeMining.memories.title', {
          defaultMessage: 'Knowledge Base',
        })}
        description={i18n.translate('xpack.knowledgeMining.memories.description', {
          defaultMessage:
            'Browse and manage persistent memories extracted from conversations. Agents use these during conversations.',
        })}
      />
      <EuiPageSection>
        <EuiFieldSearch
          placeholder={i18n.translate('xpack.knowledgeMining.memories.searchPlaceholder', {
            defaultMessage: 'Search memories...',
          })}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          isClearable
          fullWidth
        />
        <EuiSpacer size="m" />
        <EuiFlexGroup>
          <EuiFlexItem grow={1}>
            <EuiPanel paddingSize="s" hasBorder>
              {treeItems.length > 0 ? (
                <EuiTreeView
                  items={treeItems}
                  aria-label="Memory tree"
                  expandByDefault={false}
                  showExpansionArrows
                />
              ) : (
                <EuiText size="s" color="subdued" textAlign="center">
                  {loading
                    ? i18n.translate('xpack.knowledgeMining.memories.loading', {
                        defaultMessage: 'Loading...',
                      })
                    : i18n.translate('xpack.knowledgeMining.memories.empty', {
                        defaultMessage: 'No memories found',
                      })}
                </EuiText>
              )}
            </EuiPanel>
          </EuiFlexItem>
          <EuiFlexItem grow={3}>
            <EuiPanel paddingSize="m" hasBorder>
              {selectedMemory ? (
                <>
                  <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
                    <EuiFlexItem>
                      <EuiText>
                        <h3>{selectedMemory.title}</h3>
                      </EuiText>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiFlexGroup gutterSize="s">
                        <EuiFlexItem grow={false}>
                          <EuiBadge>{selectedMemory.memory_type}</EuiBadge>
                        </EuiFlexItem>
                        {selectedMemory.tags.map((tag) => (
                          <EuiFlexItem key={tag} grow={false}>
                            <EuiBadge color="hollow">{tag}</EuiBadge>
                          </EuiFlexItem>
                        ))}
                      </EuiFlexGroup>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                  <EuiSpacer size="s" />
                  <EuiText size="xs" color="subdued">
                    {selectedMemory.path}
                  </EuiText>
                  <EuiSpacer size="m" />
                  <EuiCodeBlock language="markdown" paddingSize="m" overflowHeight={400}>
                    {selectedMemory.content}
                  </EuiCodeBlock>
                  <EuiSpacer size="m" />
                  <EuiFlexGroup justifyContent="flexEnd">
                    <EuiFlexItem grow={false}>
                      <EuiButtonEmpty color="danger" onClick={handleDelete}>
                        {i18n.translate('xpack.knowledgeMining.memories.delete', {
                          defaultMessage: 'Delete',
                        })}
                      </EuiButtonEmpty>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </>
              ) : (
                <EuiEmptyPrompt
                  title={
                    <h3>
                      {i18n.translate('xpack.knowledgeMining.memories.selectPrompt', {
                        defaultMessage: 'Select a memory',
                      })}
                    </h3>
                  }
                  body={i18n.translate('xpack.knowledgeMining.memories.selectBody', {
                    defaultMessage:
                      'Choose a memory from the tree on the left to view its contents.',
                  })}
                />
              )}
            </EuiPanel>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPageSection>
    </>
  );
};
