/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createTreeNodesFromPipelines } from './create_tree_nodes';
import { MAX_TREE_LEVEL } from './constants';
import type { PipelineTreeNode } from './types';

describe('createTreeNodesFromPipelines', () => {
  it('creates a single node with no children', () => {
    const input: PipelineTreeNode = {
      pipelineName: 'root',
      isManaged: false,
      children: [],
    };

    const result = createTreeNodesFromPipelines(input);

    expect(result.id).toBe('root');
    expect(result.label).toBe('root');
    expect(result.children).toHaveLength(0);
    expect(result.icon).toBeUndefined();
  });

  it('creates a node with a managed icon', () => {
    const input: PipelineTreeNode = {
      pipelineName: 'secure-pipeline',
      isManaged: true,
      children: [],
    };

    const result = createTreeNodesFromPipelines(input);

    expect(result.icon).toBeTruthy();
  });

  it('creates nested child nodes up to the max depth', () => {
    // Create a deeply nested structure up to MAX_TREE_LEVEL + 2
    const createDeepTree = (depth: number): PipelineTreeNode => {
      if (depth === 0) {
        return { pipelineName: `leaf`, isManaged: false, children: [] };
      }
      return {
        pipelineName: `node-${depth}`,
        isManaged: false,
        children: [createDeepTree(depth - 1)],
      };
    };

    const input = createDeepTree(MAX_TREE_LEVEL + 2);
    const result = createTreeNodesFromPipelines(input);

    // Traverse to ensure we only went MAX_TREE_LEVEL deep
    let current = result;
    let level = 1;
    while (current.children!.length > 0) {
      current = current.children![0];
      level++;
    }

    expect(level).toBe(MAX_TREE_LEVEL);
  });

  it('sets the correct label and id for nested nodes', () => {
    const input: PipelineTreeNode = {
      pipelineName: 'root',
      isManaged: false,
      children: [
        {
          pipelineName: 'child1',
          isManaged: false,
          children: [
            {
              pipelineName: 'grandchild1',
              isManaged: false,
              children: [],
            },
          ],
        },
      ],
    };

    const result = createTreeNodesFromPipelines(input);
    expect(result.id).toBe('root');
    expect(result.children![0].id).toBe('child1');
    expect(result.children![0].children![0].id).toBe('grandchild1');
  });
});
