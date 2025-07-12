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

const traverseTree = (
  treeNode: PipelineTreeNode,
  selectedPipeline: string,
  setSelectedPipeline: (pipelineName: string) => void,
  level: number
): Node => {
  const currentNode = {
    id: treeNode.pipelineName,
    label: (
      <PipelineTreeNodeLabel
        pipelineName={treeNode.pipelineName}
        isManaged={treeNode.isManaged}
        isDeprecated={treeNode.isDeprecated}
        setSelected={() => setSelectedPipeline(treeNode.pipelineName)}
      />
    ),
    'data-test-subj': `pipelineTreeNode-${treeNode.pipelineName}`,
    className:
      (level === 1 ? 'cssTreeNode-root' : 'cssTreeNode-children') +
      (treeNode.pipelineName === selectedPipeline ? '--active' : ''),
    children: treeNode.children.length ? ([] as Node[]) : undefined,
    isExpanded: level === 1,
    // Disable EUI's logic for activating tree node when expanding/collapsing them
    // We should only activate a tree node when we click on the pipeline name
    isActive: false,
  };

  if (level === MAX_TREE_LEVEL) {
    if (treeNode.children) {
      const morePipelinesNode = {
        id: `${treeNode.pipelineName}-moreChildrenPipelines`,
        label: <MorePipelinesLabel count={treeNode.children.length} />,
        'data-test-subj': `pipelineTreeNode-${treeNode.pipelineName}-moreChildrenPipelines`,
        className: 'cssTreeNode-morePipelines',
      };
      currentNode.children!.push(morePipelinesNode);
    }
    return currentNode;
  }
  treeNode.children.forEach((node) => {
    currentNode.children!.push(
      traverseTree(node, selectedPipeline, setSelectedPipeline, level + 1)
    );
  });
  return currentNode;
};

/**
 * This function takes a {@link PipelineTreeNode} tree of pipeline names, traverses it
 * recursively, and returns a Node tree that can be passed to an {@link EuiTreeView}.
 */
export const createTreeNodesFromPipelines = (
  pipelines: PipelineTreeNode,
  selectedPipeline: string,
  setSelectedPipeline: (pipelineName: string) => void
): Node => {
  return traverseTree(pipelines, selectedPipeline, setSelectedPipeline, 1);
};
