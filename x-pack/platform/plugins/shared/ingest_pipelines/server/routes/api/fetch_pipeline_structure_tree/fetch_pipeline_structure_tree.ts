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

export const fetchPipelineStructureTree = (
  allPipelines: {
    [key: string]: estypes.IngestPipeline;
  },
  rootPipelineName: string,
  level: number = 1
): PipelineTreeNode => {
  const rootPipeline = allPipelines[rootPipelineName];
  const pipelineNode: PipelineTreeNode = {
    pipelineName: rootPipelineName,
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
