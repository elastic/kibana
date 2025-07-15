/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { asyncForEach } from '@kbn/std';
import { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import { Processor } from '../../../../common/types';

export interface PipelineTreeNode {
  pipelineName: string;
  isManaged: boolean;
  isDeprecated: boolean;
  children: PipelineTreeNode[];
}

export const fetchPipelineStructureTree = async (
  client: IScopedClusterClient,
  rootPipelineName: string,
  level: number = 1
) => {
  const rootPipeline = await client.asCurrentUser.ingest.getPipeline({
    id: rootPipelineName,
  });
  const pipelineNode: PipelineTreeNode = {
    pipelineName: rootPipelineName,
    isManaged: Boolean(rootPipeline?._meta?.managed === true),
    isDeprecated: false,
    children: [],
  };
  if (level === 6) {
    return pipelineNode;
  }
  const processorPipelines =
    (rootPipeline?.processors as Processor[])
      .filter((p) => p.pipeline !== undefined)
      .map((p) => p.pipeline.name) ?? [];
  await asyncForEach(processorPipelines, async (pipeline) => {
    const pipelineChild = await fetchPipelineStructureTree(client, pipeline, level + 1);
    pipelineNode.children!.push(pipelineChild);
  });
  return pipelineNode;
};
