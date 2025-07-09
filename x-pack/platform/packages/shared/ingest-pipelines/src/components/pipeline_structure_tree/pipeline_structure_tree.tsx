/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiTreeView } from '@elastic/eui';
import type { PipelineTreeNode } from './types';
import { createTreeNodesFromPipelines } from './create_tree_nodes';
import { styles } from './styles';

export interface PipelineStructureTreeProps {
  pipelineTree: PipelineTreeNode;
}

/**
 * A component for a Pipeline structure tree.
 * If a pipeline node has children pipeline nodes, it means that those pipelines
 * are pipeline processors of the current pipeline.
 */
export const PipelineStructureTree = (props: PipelineStructureTreeProps) => {
  const treeNode = createTreeNodesFromPipelines(props.pipelineTree);

  return <EuiTreeView items={[treeNode]} showExpansionArrows={true} css={styles} />;
};
