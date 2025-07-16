/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PipelineTreeNode } from '@kbn/ingest-pipelines-shared';
import { MAX_TREE_LEVEL } from '@kbn/ingest-pipelines-shared';
import { estypes } from '@elastic/elasticsearch';
import { Processor } from '../../../../common/types';

/**
 * This function fetches a Pipeline Structure Tree of type {@link PipelineTreeNode}
 * with a root pipeline {@link rootPipelineName}
 *
 * Note: We fetch MAX_TREE_LEVEL + 1 levels of pipelines, since this generated
 * structure tree will be used by the {@link PipelineStructureTree} component, which
 * displays MAX_TREE_LEVEL levels of pipeline. The tree nodes at the MAX_TREE_LEVEL level
 * have child nodes "+X more pipelines" so we need to know how many children
 * the MAX_TREE_LEVEL level nodes have. Therefore we fetch one more level
 * (MAX_TREE_LEVEL + 1) as well.
 *
 * @param allPipelines All pipelines as returned by Elasticsearch
 * @param rootPipelineId The pipeline
 * @param level The level of the current {@link rootPipelineName} pipeline
 */
export const fetchPipelineStructureTree = (
  allPipelines: {
    [key: string]: estypes.IngestPipeline;
  },
  rootPipelineId: string,
  level: number = 1
): PipelineTreeNode => {
  const rootPipeline = allPipelines[rootPipelineId];
  const pipelineNode: PipelineTreeNode = {
    pipelineName: rootPipelineId,
    isManaged: Boolean(rootPipeline?._meta?.managed === true),
    isDeprecated: Boolean(rootPipeline?.deprecated === true),
    children: [],
  };
  if (level === MAX_TREE_LEVEL + 1) {
    return pipelineNode;
  }
  const processorPipelines =
    ((rootPipeline?.processors as Processor[]) ?? [])
      .filter((p) => p.pipeline !== undefined)
      .map((p) => p.pipeline.name) ?? [];
  processorPipelines.forEach((pipeline) => {
    const pipelineChild = fetchPipelineStructureTree(allPipelines, pipeline, level + 1);
    pipelineNode.children!.push(pipelineChild);
  });
  return pipelineNode;
};
