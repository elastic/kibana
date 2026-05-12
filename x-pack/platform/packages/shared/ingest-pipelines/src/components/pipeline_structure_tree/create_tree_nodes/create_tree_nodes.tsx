/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Node } from '@elastic/eui/src/components/tree_view/tree_view';
import type { PipelineTreeNode } from '../types';
import { MAX_TREE_LEVEL } from '../constants';
import { PipelineTreeNodeLabel, MorePipelinesLabel } from '../tree_node_labels';

/**
 * This function takes a {@link PipelineTreeNode} tree of pipeline names, traverses it
 * recursively, and returns a Node tree that can be passed to an {@link EuiTreeView}.
 */
export const createTreeNodesFromPipelines = (
  treeNode: PipelineTreeNode,
  selectedPipeline: string | undefined,
  clickTreeNode: (pipelineName: string) => void,
  clickMorePipelines: (name: string) => void,
  level: number = 1
): Node => {
  const currentNode = {
    id: treeNode.pipelineName,
    label: (
      <PipelineTreeNodeLabel
        pipelineName={treeNode.pipelineName}
        isManaged={treeNode.isManaged}
        isDeprecated={treeNode.isDeprecated}
        isSelected={treeNode.pipelineName === selectedPipeline}
        onClick={() => clickTreeNode(treeNode.pipelineName)}
        level={level - 1}
      />
    ),
    'data-test-subj': `pipelineTreeNode-${treeNode.pipelineName}-moreChildrenPipelines`,
    className:
      (level === 1 ? 'cssTreeNode-root' : 'cssTreeNode-children') +
      (treeNode.pipelineName === selectedPipeline ? '--active' : ''),
    children: treeNode.children.length ? [] : undefined,
    isExpanded: level === 1,
  } as unknown as Node;

  if (level === MAX_TREE_LEVEL) {
    if (treeNode.children.length > 0) {
      const morePipelinesNode = {
        id: `${treeNode.pipelineName}-moreChildrenPipelines`,
        label: <MorePipelinesLabel count={treeNode.children.length} />,
        'data-test-subj': `pipelineTreeNode-${treeNode.pipelineName}-moreChildrenPipelines`,
        className: 'cssTreeNode-morePipelines',
        callback: () => clickMorePipelines(treeNode.pipelineName),
      } as unknown as Node;
      currentNode.children!.push(morePipelinesNode);
    }
    return currentNode;
  }
  treeNode.children.forEach((node) => {
    currentNode.children!.push(
      createTreeNodesFromPipelines(
        node,
        selectedPipeline,
        clickTreeNode,
        clickMorePipelines,
        level + 1
      )
    );
  });
  return currentNode;
};
