/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PipelineTreeNode } from '@kbn/ingest-pipelines-shared';
import { MAX_TREE_LEVEL } from '@kbn/ingest-pipelines-shared';
import type { estypes } from '@elastic/elasticsearch';
import type { Processor } from '../../../../common/types';

/**
 * This function fetches a Pipeline Structure Tree of type {@link PipelineTreeNode}
 * with a root pipeline {@link rootPipelineName}
 *
 * Note: We fetch MAX_TREE_LEVEL + 1 levels of pipelines, since this generated
 * structure tree will be used by the {@link PipelineStructureTree} component, which
 * displays MAX_TREE_LEVEL levels of pipeline and the tree nodes at the MAX_TREE_LEVEL
 * level have child nodes "+X more pipelines" so we need to know how many children
 * the MAX_TREE_LEVEL level nodes have. Therefore we fetch one more level
 * (MAX_TREE_LEVEL + 1) as well.
 *
 * @param allPipelines All pipelines as returned by Elasticsearch
 * @param rootPipelineId The root pipeline of the tree
 * @param level The level of the current {@link rootPipelineName} pipeline
 * @param createdNodes The created nodes so far
 */
export const fetchPipelineStructureTree = (
  allPipelines: Record<string, estypes.IngestPipeline>,
  rootPipelineId: string,
  level: number = 1,
  createdNodes: Record<string, PipelineTreeNode> = {}
): PipelineTreeNode => {
  const rootPipeline = allPipelines[rootPipelineId];
  if (!rootPipeline) {
    return {
      pipelineName: rootPipelineId,
      isManaged: false,
      isDeprecated: false,
      children: [],
    };
  }

  const pipelineNode: PipelineTreeNode = {
    pipelineName: rootPipelineId,
    isManaged: rootPipeline._meta?.managed === true,
    isDeprecated: rootPipeline.deprecated === true,
    children: [],
  };

  if (level > MAX_TREE_LEVEL) {
    return pipelineNode;
  }

  const processors = (rootPipeline.processors as Processor[]) ?? [];

  processors.forEach((processor) => {
    const pipelineProcessorName = processor.pipeline?.name;
    if (!pipelineProcessorName) return;

    if (createdNodes[pipelineProcessorName]) {
      pipelineNode.children.push(createdNodes[pipelineProcessorName]);
    } else {
      const childNode = fetchPipelineStructureTree(
        allPipelines,
        pipelineProcessorName,
        level + 1,
        createdNodes
      );
      if (childNode) {
        createdNodes[pipelineProcessorName] = childNode;
        pipelineNode.children.push(childNode);
      }
    }
  });

  return pipelineNode;
};
