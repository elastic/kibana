/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { createTreeNodesFromPipelines } from './create_tree_nodes';
import { MAX_TREE_LEVEL } from '../constants';
import type { PipelineTreeNode } from '../types';
import { EuiTreeView } from '@elastic/eui';

const renderTreeNode = (node: ReturnType<typeof createTreeNodesFromPipelines>) => {
  return render(<EuiTreeView items={[node]} display="compressed" aria-label="Pipeline tree" />);
};

describe('createTreeNodesFromPipelines', () => {
  it('renders a basic pipeline node label', () => {
    const setSelectedPipeline = jest.fn();
    const pipeline: PipelineTreeNode = {
      pipelineName: 'root-pipeline',
      isManaged: false,
      isDeprecated: false,
      children: [],
    };

    const node = createTreeNodesFromPipelines(pipeline, '', setSelectedPipeline);
    const { getByTestId } = renderTreeNode(node);

    expect(getByTestId('pipelineTreeNode-root-pipeline')).toBeInTheDocument();
  });

  it('renders managed and deprecated icons', () => {
    const setSelectedPipeline = jest.fn();
    const pipeline: PipelineTreeNode = {
      pipelineName: 'managed-deprecated',
      isManaged: true,
      isDeprecated: true,
      children: [],
    };

    const node = createTreeNodesFromPipelines(pipeline, '', setSelectedPipeline);
    const { getByTestId } = renderTreeNode(node);

    expect(getByTestId('pipelineTreeNode-managed-deprecated-managedIcon')).toBeInTheDocument();
    expect(getByTestId('pipelineTreeNode-managed-deprecated-deprecatedIcon')).toBeInTheDocument();
  });

  it('calls setSelectedPipeline when node label is clicked', () => {
    const setSelectedPipeline = jest.fn();
    const pipeline: PipelineTreeNode = {
      pipelineName: 'test-pipeline',
      isManaged: false,
      isDeprecated: false,
      children: [],
    };

    const node = createTreeNodesFromPipelines(pipeline, '', setSelectedPipeline);
    const { getByTestId } = renderTreeNode(node);

    fireEvent.click(getByTestId('pipelineTreeNodeLink-test-pipeline'));
    expect(setSelectedPipeline).toHaveBeenCalledWith('test-pipeline');
  });

  it('adds active class when selectedPipeline matches', () => {
    const setSelectedPipeline = jest.fn();
    const pipeline: PipelineTreeNode = {
      pipelineName: 'selected-one',
      isManaged: false,
      isDeprecated: false,
      children: [],
    };

    const node = createTreeNodesFromPipelines(pipeline, 'selected-one', setSelectedPipeline);

    expect(node.className).toContain('--active');
  });

  it('adds a "+ more pipelines" label when max depth is reached', () => {
    const setSelectedPipeline = jest.fn();

    // Create a deeply nested tree exceeding MAX_TREE_LEVEL
    const deepTree = (level: number): PipelineTreeNode => {
      if (level === 0) {
        return {
          pipelineName: 'leaf',
          isManaged: false,
          isDeprecated: false,
          children: [],
        };
      }
      return {
        pipelineName: `node-${level}`,
        isManaged: false,
        isDeprecated: false,
        children: [deepTree(level - 1)],
      };
    };

    const root = deepTree(MAX_TREE_LEVEL + 1);
    const node = createTreeNodesFromPipelines(root, '', setSelectedPipeline);

    // Traverse to the level that contains the "more pipelines" node
    let current = node;
    for (let i = 0; i < MAX_TREE_LEVEL - 1; i++) {
      current = current.children![0];
    }

    const finalLevelChildren = current.children!;
    expect(finalLevelChildren).toHaveLength(1);
    expect(finalLevelChildren[0].id).toMatch(/-moreChildrenPipelines$/);
  });
});
