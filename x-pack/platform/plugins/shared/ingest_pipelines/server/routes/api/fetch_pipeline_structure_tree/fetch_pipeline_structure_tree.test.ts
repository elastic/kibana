/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fetchPipelineStructureTree } from './fetch_pipeline_structure_tree';
import { MAX_TREE_LEVEL } from '@kbn/ingest-pipelines-shared';
import type { estypes } from '@elastic/elasticsearch';

describe('fetchPipelineStructureTree', () => {
  it('fetches a simple root pipeline', () => {
    const allPipelines: Record<string, estypes.IngestPipeline> = {
      'my-pipeline': {
        _meta: { managed: true },
        deprecated: true,
        processors: [],
      },
    };

    const result = fetchPipelineStructureTree(allPipelines, 'my-pipeline');

    expect(result).toEqual({
      pipelineName: 'my-pipeline',
      isManaged: true,
      isDeprecated: true,
      children: [],
    });
  });

  it('recursively fetches child pipelines from processors', () => {
    const allPipelines: Record<string, estypes.IngestPipeline> = {
      root: {
        processors: [{ pipeline: { name: 'child-1' } }, { pipeline: { name: 'child-2' } }],
      },
      'child-1': {
        _meta: { managed: true },
        processors: [],
      },
      'child-2': {
        deprecated: true,
        processors: [],
      },
    };

    const result = fetchPipelineStructureTree(allPipelines, 'root');

    expect(result).toEqual({
      pipelineName: 'root',
      isManaged: false,
      isDeprecated: false,
      children: [
        {
          pipelineName: 'child-1',
          isManaged: true,
          isDeprecated: false,
          children: [],
        },
        {
          pipelineName: 'child-2',
          isManaged: false,
          isDeprecated: true,
          children: [],
        },
      ],
    });
  });

  it('stops recursion when MAX_TREE_LEVEL is reached', () => {
    const allPipelines: Record<string, estypes.IngestPipeline> = {
      root: {
        processors: [{ pipeline: { name: 'infinite' } }],
      },
      infinite: {
        processors: [{ pipeline: { name: 'infinite' } }],
      },
    };

    const result = fetchPipelineStructureTree(allPipelines, 'infinite', MAX_TREE_LEVEL + 1);

    expect(result).toEqual({
      pipelineName: 'infinite',
      isManaged: false,
      isDeprecated: false,
      children: [],
    });

    const resultFromRoot = fetchPipelineStructureTree(allPipelines, 'root');

    let lastLeaf = resultFromRoot;
    let currentLevel = 1;
    while (currentLevel < MAX_TREE_LEVEL + 1) {
      lastLeaf = lastLeaf.children[0];
      currentLevel++;
    }
    expect(lastLeaf).toEqual({
      pipelineName: 'infinite',
      isManaged: false,
      isDeprecated: false,
      children: [],
    });
  });

  it('handles processors with non-pipeline entries safely', () => {
    const allPipelines: Record<string, estypes.IngestPipeline> = {
      root: {
        processors: [{ set: { field: 'foo', value: 'bar' } }, { pipeline: { name: 'sub' } }],
      },
      sub: {
        processors: [],
      },
    };

    const result = fetchPipelineStructureTree(allPipelines, 'root');

    expect(result.children).toHaveLength(1);
    expect(result.children?.[0].pipelineName).toBe('sub');
  });

  it('handles missing processors, deprecated, and managed fields gracefully', () => {
    const allPipelines: Record<string, estypes.IngestPipeline> = {
      root: {},
    };

    const result = fetchPipelineStructureTree(allPipelines, 'root');

    expect(result).toEqual({
      pipelineName: 'root',
      isManaged: false,
      isDeprecated: false,
      children: [],
    });
  });
});
