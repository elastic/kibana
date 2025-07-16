/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fetchPipelineStructureTree } from './fetch_pipeline_structure_tree';
import { MAX_TREE_LEVEL } from '@kbn/ingest-pipelines-shared';
import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';

const createMockClient = () => ({
  asCurrentUser: {
    ingest: {
      getPipeline: jest.fn(),
    },
  },
});

describe('fetchPipelineStructureTree', () => {
  let client: ReturnType<typeof createMockClient>;

  beforeEach(() => {
    client = createMockClient();
  });

  it('fetches a simple root pipeline', async () => {
    client.asCurrentUser.ingest.getPipeline.mockResolvedValue({
      _meta: { managed: true },
      deprecated: true,
      processors: [],
    });

    const result = await fetchPipelineStructureTree(
      client as unknown as IScopedClusterClient,
      'my-pipeline'
    );

    expect(result).toEqual({
      pipelineName: 'my-pipeline',
      isManaged: true,
      isDeprecated: true,
      children: [],
    });

    expect(client.asCurrentUser.ingest.getPipeline).toHaveBeenCalledWith({ id: 'my-pipeline' });
  });

  it('recursively fetches child pipelines from processors', async () => {
    client.asCurrentUser.ingest.getPipeline.mockImplementation(async ({ id }) => {
      if (id === 'root') {
        return {
          _meta: {},
          deprecated: false,
          processors: [{ pipeline: { name: 'child-1' } }, { pipeline: { name: 'child-2' } }],
        };
      }
      if (id === 'child-1') {
        return {
          _meta: { managed: true },
          deprecated: false,
          processors: [],
        };
      }
      if (id === 'child-2') {
        return {
          _meta: {},
          deprecated: true,
          processors: [],
        };
      }
      return {};
    });

    const result = await fetchPipelineStructureTree(
      client as unknown as IScopedClusterClient,
      'root'
    );

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

  it('stops recursion when MAX_TREE_LEVEL is reached', async () => {
    const depth = MAX_TREE_LEVEL + 2;

    client.asCurrentUser.ingest.getPipeline.mockImplementation(async ({ id }) => ({
      _meta: {},
      deprecated: false,
      processors: [{ pipeline: { name: 'leaf' } }],
    }));

    const result = await fetchPipelineStructureTree(
      client as unknown as IScopedClusterClient,
      'leaf',
      MAX_TREE_LEVEL + 1
    );

    expect(result).toEqual({
      pipelineName: 'leaf',
      isManaged: false,
      isDeprecated: false,
      children: [],
    });

    // Should not recurse further
    expect(client.asCurrentUser.ingest.getPipeline).toHaveBeenCalledTimes(1);
  });

  it('handles processors with non-pipeline entries safely', async () => {
    client.asCurrentUser.ingest.getPipeline.mockImplementation(async ({ id }) => {
      if (id === 'root') {
        return {
          _meta: {},
          deprecated: false,
          processors: [{ set: { field: 'foo', value: 'bar' } }, { pipeline: { name: 'sub' } }],
        };
      }
      return {
        _meta: {},
        deprecated: false,
        processors: [],
      };
    });

    const result = await fetchPipelineStructureTree(
      client as unknown as IScopedClusterClient,
      'root'
    );

    expect(result.children).toHaveLength(1);
    expect(result.children?.[0].pipelineName).toBe('sub');
  });
});
