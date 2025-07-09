/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiIconTip, EuiLink, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { Node } from '@elastic/eui/src/components/tree_view/tree_view';
import { i18n } from '@kbn/i18n';
import type { PipelineTreeNode } from './types';
import { MAX_TREE_LEVEL } from './constants';

const traverseTree = (treeNode: PipelineTreeNode, level: number): Node => {
  const currentNode = {
    id: treeNode.pipelineName,
    label: (
      <EuiFlexGroup direction="row" css={{ width: '450px' }}>
        <EuiFlexItem>
          <EuiLink color="text" onClick={() => {}}>
            {treeNode.pipelineName}
          </EuiLink>
        </EuiFlexItem>
        <EuiFlexItem>
          {treeNode.isManaged && (
            <EuiIconTip
              content={i18n.translate(
                'ingestPipelines.pipelineStructureTree.treeNodeManagedTooltip',
                {
                  defaultMessage: 'Managed',
                }
              )}
              type="lock"
              position="top"
            />
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
    'data-test-subj': `pipelineTreeNode-${treeNode.pipelineName}`,
    className: `cssTreeNode-level-${level}`,
    children: [] as Node[],
  };
  if (level === MAX_TREE_LEVEL) {
    return currentNode;
  }
  treeNode.children.forEach((node) => {
    currentNode.children.push(traverseTree(node, level + 1));
  });
  return currentNode;
};

/**
 * This function takes a {@link PipelineTree} tree of pipeline names, traverses it
 * recursively, and returns a Node tree that can be passed the an {@link EuiTreeView}.
 */
export const createTreeNodesFromPipelines = (pipelines: PipelineTreeNode): Node => {
  return traverseTree(pipelines, 1);
};
